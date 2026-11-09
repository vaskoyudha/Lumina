import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { AccountProgressProvider } from "@/components/belajar/belajar-progress";
import { CONTENT_FIXTURE, MODULE_FIXTURES } from "@/lib/content/fixtures";
import {
  getAccountProgress,
  submitQuiz,
  submitSimulation,
} from "@/lib/learning/actions";
import { completeModule, EMPTY_PROGRESS, type Progress } from "@/lib/progress";

export function mockAccount(progress: Progress = EMPTY_PROGRESS) {
  jest
    .mocked(getAccountProgress)
    .mockResolvedValue({ ok: true, progress, simulations: [] });
  jest.mocked(submitSimulation).mockResolvedValue({ ok: true });
  jest.mocked(submitQuiz).mockImplementation(async (input) => {
    const value = input as {
      moduleNo: number;
      complete: boolean;
      answers: Record<string, string>;
    };
    const questions =
      CONTENT_FIXTURE.modules.find((m) => m.metadata.no === value.moduleNo)
        ?.content?.kuis ?? [];
    const next = {
      ...(value.complete ? completeModule(progress, value.moduleNo) : progress),
      missedPatterns: questions
        .filter((q) => q.correctId !== value.answers[q.id])
        .map((q) => q.id),
    };
    return { ok: true, progress: next };
  });
}
export function renderAccount(children: ReactNode) {
  return render(
    <AccountProgressProvider modules={MODULE_FIXTURES}>
      {children}
    </AccountProgressProvider>,
  );
}
