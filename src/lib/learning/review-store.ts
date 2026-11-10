import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { PATTERN_BY_ID } from "@/data/patterns";
import { authDatabase } from "@/lib/auth/database";
import { getModule } from "@/lib/content/store";
import { patternForQuestion } from "@/lib/learning/pattern-map";
import { gradeReview } from "@/lib/learning/review";
import { EMPTY_PROGRESS, type Review } from "@/lib/progress";

export async function learningTransaction<T>(
  userId: string,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await authDatabase().connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [
      `learning:${userId}`,
    ]);
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
export async function readLearningReviews(
  userId: string,
  db = authDatabase(),
): Promise<Review[]> {
  const { rows } = await db.query(
    "SELECT * FROM learning_reviews WHERE user_id=$1 ORDER BY due_at,pattern_id LIMIT 100",
    [userId],
  );
  return rows.map((r) => ({
    patternId: r.pattern_id,
    box: r.box,
    dueAt: r.due_at.toISOString(),
    lastSeenAt: r.last_seen_at.toISOString(),
    correct: r.correct,
    wrong: r.wrong,
  }));
}
export async function readLearningAttempts(userId: string) {
  const { rows } = await authDatabase().query(
    "SELECT module_no,score,total,created_at FROM learning_attempts WHERE user_id=$1 ORDER BY created_at DESC,id LIMIT 100",
    [userId],
  );
  return rows.reverse().map((r) => ({
    moduleNo: r.module_no,
    score: r.score,
    total: r.total,
    at: r.created_at.toISOString(),
  }));
}
async function insertAttempt(
  client: PoolClient,
  userId: string,
  moduleNo: number,
  score: number,
  total: number,
  kind: "quiz" | "review",
  id: string,
  answers: Record<string, string>,
) {
  const result = await client.query(
    "INSERT INTO learning_attempts(id,user_id,module_no,score,total,kind,answers) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING RETURNING id",
    [id, userId, moduleNo, score, total, kind, JSON.stringify(answers)],
  );
  if (!result.rowCount) {
    const match = await client.query(
      "SELECT 1 FROM learning_attempts WHERE id=$1 AND user_id=$2 AND module_no=$3 AND score=$4 AND total=$5 AND kind=$6 AND answers=$7::jsonb",
      [id, userId, moduleNo, score, total, kind, JSON.stringify(answers)],
    );
    if (!match.rowCount) throw new Error("Percobaan belajar tidak cocok.");
    return false;
  }
  await client.query(
    "DELETE FROM learning_attempts WHERE user_id=$1 AND id IN (SELECT id FROM learning_attempts WHERE user_id=$1 ORDER BY created_at DESC,id OFFSET 100)",
    [userId],
  );
  return true;
}
async function writeReview(
  client: PoolClient,
  userId: string,
  patternId: string,
  correct: boolean,
  now: Date,
) {
  const { rows } = await client.query(
    "SELECT * FROM learning_reviews WHERE user_id=$1 AND pattern_id=$2",
    [userId, patternId],
  );
  const row = rows[0];
  const previous: Review[] = row
    ? [
        {
          patternId,
          box: row.box,
          dueAt: row.due_at.toISOString(),
          lastSeenAt: row.last_seen_at.toISOString(),
          correct: row.correct,
          wrong: row.wrong,
        },
      ]
    : [];
  const review = gradeReview(
    { ...EMPTY_PROGRESS, reviews: previous },
    patternId,
    correct,
    now,
  ).reviews?.[0];
  if (!review) return;
  await client.query(
    `INSERT INTO learning_reviews(user_id,pattern_id,box,due_at,last_seen_at,correct,wrong) VALUES($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT(user_id,pattern_id) DO UPDATE SET box=EXCLUDED.box,due_at=EXCLUDED.due_at,last_seen_at=EXCLUDED.last_seen_at,correct=EXCLUDED.correct,wrong=EXCLUDED.wrong`,
    [
      userId,
      patternId,
      review.box,
      review.dueAt,
      review.lastSeenAt,
      review.correct,
      review.wrong,
    ],
  );
}
export async function recordQuizLearning(
  client: PoolClient,
  userId: string,
  moduleNo: number,
  answers: Record<string, string>,
  correctIds: Record<string, string>,
  attemptId: string = randomUUID(),
) {
  const entries = Object.entries(answers);
  const score = entries.filter(
    ([id, answer]) => answer === correctIds[id],
  ).length;
  if (
    !(await insertAttempt(
      client,
      userId,
      moduleNo,
      score,
      entries.length,
      "quiz",
      attemptId,
      answers,
    ))
  )
    return;
  const missed = new Set(
    entries
      .filter(([id, a]) => a !== correctIds[id])
      .map(([id]) => patternForQuestion(id)),
  );
  const patterns = [
    ...new Set(entries.map(([id]) => patternForQuestion(id))),
  ].filter((p): p is NonNullable<typeof p> => p !== null);
  for (const pattern of patterns) {
    // Correct first encounters are not a missed pattern to review. Existing
    // reviews are reinforced; every miss creates/resets its own schedule.
    const existing = await client.query(
      "SELECT 1 FROM learning_reviews WHERE user_id=$1 AND pattern_id=$2",
      [userId, pattern],
    );
    if (missed.has(pattern) || existing.rowCount)
      await writeReview(
        client,
        userId,
        pattern,
        !missed.has(pattern),
        new Date(),
      );
  }
}
export async function savePractice(
  userId: string,
  input: {
    attemptId: string;
    moduleNo: number;
    questionId: string;
    answer: string;
  },
) {
  const module = await getModule(input.moduleNo);
  const question = module?.content?.kuis.find((q) => q.id === input.questionId);
  const patternId = patternForQuestion(input.questionId);
  if (
    !question ||
    !patternId ||
    PATTERN_BY_ID.get(patternId)?.moduleNo !== input.moduleNo ||
    !question.options.some((o) => o.id === input.answer)
  )
    throw new Error("Soal latihan tidak tersedia.");
  const correct = question.correctId === input.answer;
  await learningTransaction(userId, async (client) => {
    if (
      await insertAttempt(
        client,
        userId,
        input.moduleNo,
        Number(correct),
        1,
        "review",
        input.attemptId,
        { [input.questionId]: input.answer },
      )
    ) {
      await writeReview(client, userId, patternId, correct, new Date());
    }
  });
  return { correct, rationale: question.rationale };
}
