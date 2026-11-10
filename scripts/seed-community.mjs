import pg from "pg";

/**
 * Demo-only seed for `/komunitas`.
 *
 * Creates a handful of fictional members, nine scam-modus briefs with cover
 * art, replies, and helpful reactions so the feed is not empty during a local
 * presentation. Every account uses the reserved `@contoh.lumina` domain, has no
 * password (display-only), and the script is idempotent: running it twice
 * updates the seeded rows instead of duplicating them.
 *
 * Requires migrations through `006_community_gallery.sql`; cover files live in
 * `public/images/community/` and are seed-only, never accepted from the editor.
 * `imageUrls` is the gallery the feed renders; `imageUrl` stays the first cover
 * so older reads keep working.
 *
 * Do NOT run this against production. Use `--reset` to remove only the seeded
 * accounts (their posts, replies, and reactions cascade) before re-inserting.
 */

const SEED_DOMAIN = "@contoh.lumina";

const MEMBERS = [
  {
    id: "0c9a1a10-0000-4000-8000-000000000001",
    email: `rina${SEED_DOMAIN}`,
    nama: "Rina Kartika",
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000002",
    email: `bagas${SEED_DOMAIN}`,
    nama: "Bagas Pratama",
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000003",
    email: `sari${SEED_DOMAIN}`,
    nama: "Sari Wulandari",
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000004",
    email: `dimas${SEED_DOMAIN}`,
    nama: "Dimas Nugroho",
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000005",
    email: `ayu${SEED_DOMAIN}`,
    nama: "Ayu Lestari",
  },
];

/**
 * Nine fictional demo briefs about 2026 Indonesian scam waves. They are
 * written as community news, not reporting: no real victim, figure, or source
 * is claimed, and every `sourceUrl` stays null so the UI never attributes a
 * made-up story to a real outlet. Cover art lives in public/images/community.
 */
const POSTS = [
  {
    id: "0c9a1a10-0000-4000-8000-000000000101",
    author: `rina${SEED_DOMAIN}`,
    category: "modus-baru",
    title: "Kurir palsu kirim APK berkedok resi paket",
    body: "Modus ini muncul lagi di grup jual-beli. Pengirim mengaku kurir dan mengirim file APK bernama resi-paket.apk lewat chat. Setelah dipasang, aplikasi meminta izin membaca SMS dan aksesibilitas, lalu mengambil kode OTP. Tanda paling jelas: ekspedisi resmi tidak pernah mengirim aplikasi lewat chat. Cek nomor resi hanya di aplikasi atau situs ekspedisi yang kamu buka sendiri.",
    imageUrl: "/images/community/apk-kurir.jpg",
    imageUrls: [
      "/images/community/apk-kurir.jpg",
      "/images/community/telepon-otp.jpg",
    ],
    sourceUrl: null,
    hoursAgo: 2,
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000102",
    author: `bagas${SEED_DOMAIN}`,
    category: "modus-baru",
    title: "Telepon suara AI mengaku petugas bank",
    body: "Pelaku memakai suara hasil kloning untuk mengaku sebagai petugas bank. Ia menyebut ada transaksi mencurigakan dan meminta kode OTP untuk membatalkan transaksi itu. Suara yang mirip bukan bukti identitas. Tutup telepon, lalu hubungi nomor di belakang kartu bank dari perangkat lain yang aman.",
    imageUrl: "/images/community/telepon-otp.jpg",
    imageUrls: [
      "/images/community/telepon-otp.jpg",
      "/images/community/apk-kurir.jpg",
    ],
    sourceUrl: null,
    hoursAgo: 5,
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000103",
    author: `sari${SEED_DOMAIN}`,
    category: "modus-baru",
    title: "Stiker QRIS di lapak diganti diam-diam",
    body: "Beberapa pembeli melaporkan stiker QRIS di meja pedagang ditimpa stiker lain. Saat dipindai, nama penerima di aplikasi bukan nama toko. Selalu periksa nama merchant di layar sebelum menekan bayar, dan minta pedagang memastikan stikernya masih asli.",
    imageUrl: "/images/community/qris-palsu.jpg",
    imageUrls: [
      "/images/community/qris-palsu.jpg",
      "/images/community/tagihan-listrik.jpg",
    ],
    sourceUrl: null,
    hoursAgo: 8,
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000104",
    author: `dimas${SEED_DOMAIN}`,
    category: "modus-baru",
    title: "Pinjol ilegal meneror kontak saat tagihan membengkak",
    body: "Pinjaman kecil berubah menjadi tagihan berkali-kali lipat dalam hitungan hari. Saat menolak membayar, pelaku menyebar data kontak dan foto ke keluarga. Pinjol legal tidak meneror dan tidak meminta akses seluruh kontak. Cek izin OJK sebelum meminjam, dan simpan bukti teror untuk laporan.",
    imageUrl: "/images/community/pinjol-teror.jpg",
    imageUrls: [
      "/images/community/pinjol-teror.jpg",
      "/images/community/lowongan-like.jpg",
    ],
    sourceUrl: null,
    hoursAgo: 12,
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000105",
    author: `ayu${SEED_DOMAIN}`,
    category: "modus-baru",
    title: "Lowongan like dan top-up menjanjikan komisi harian",
    body: "Awalnya peserta dibayar untuk memberi like atau subscribe. Setelah percaya, mereka diminta menyetor uang agar level naik dan komisi cair. Begitu setoran masuk, grup ditutup. Pekerjaan sah tidak pernah meminta kamu membayar untuk bekerja.",
    imageUrl: "/images/community/lowongan-like.jpg",
    sourceUrl: null,
    hoursAgo: 18,
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000106",
    author: `rina${SEED_DOMAIN}`,
    category: "modus-baru",
    title: "Tagihan listrik palsu lewat tautan pembayaran",
    body: "Pesan mengaku dari PLN dan menyebut tagihan akan diputus malam ini. Tautannya membuka halaman pembayaran yang meminta nomor meter, data kartu, atau kode OTP. PLN tidak menagih lewat tautan chat. Buka aplikasi resmi atau laman PLN yang kamu ketik sendiri, lalu cek tagihan di sana.",
    imageUrl: "/images/community/tagihan-listrik.jpg",
    imageUrls: [
      "/images/community/tagihan-listrik.jpg",
      "/images/community/qris-palsu.jpg",
      "/images/community/telepon-otp.jpg",
    ],
    sourceUrl: null,
    hoursAgo: 26,
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000107",
    author: `bagas${SEED_DOMAIN}`,
    category: "modus-baru",
    title: "Bansos dan BPJS palsu minta verifikasi rekening",
    body: "Pesan mengaku dari petugas Bansos atau BPJS dan meminta foto KTP, nomor rekening, serta kode OTP untuk pencairan. Bantuan resmi tidak memungut biaya dan tidak meminta kode rahasia lewat chat. Verifikasi hanya lewat kantor atau kanal resmi instansi.",
    imageUrl: "/images/community/bansos-palsu.jpg",
    sourceUrl: null,
    hoursAgo: 34,
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000108",
    author: `sari${SEED_DOMAIN}`,
    category: "modus-baru",
    title: "Robot trading menjanjikan profit pasti dari grup WhatsApp",
    body: "Grup investasi menampilkan tangkapan layar keuntungan dan mendesak anggota menambah setoran. Tidak ada robot trading legal yang menjamin profit, apalagi meminta transfer ke rekening pribadi. Cek legalitas di OJK dan Bappebti sebelum menyetor uang.",
    imageUrl: "/images/community/robot-trading.jpg",
    imageUrls: [
      "/images/community/robot-trading.jpg",
      "/images/community/pinjol-teror.jpg",
    ],
    sourceUrl: null,
    hoursAgo: 45,
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000109",
    author: `dimas${SEED_DOMAIN}`,
    category: "modus-baru",
    title: "Undangan digital membajak akun WhatsApp lewat kode verifikasi",
    body: "Tautan undangan meminta nomor WhatsApp dan kode verifikasi enam digit. Setelah kode diberikan, akun berpindah ke perangkat pelaku dan penipu menghubungi kontak korban untuk meminjam uang. Kode verifikasi WhatsApp tidak boleh diberikan kepada siapa pun, termasuk pengirim undangan.",
    imageUrl: "/images/community/ambil-alih-whatsapp.jpg",
    sourceUrl: null,
    hoursAgo: 60,
  },
];

const REPLIES = [
  {
    id: "0c9a1a10-0000-4000-8000-000000000201",
    post: POSTS[0].id,
    author: `bagas${SEED_DOMAIN}`,
    body: "APK dari luar toko resmi bisa membaca SMS dan mencuri kode OTP. Sebaiknya jangan dipasang, lalu laporkan nomornya lewat kanal resmi ekspedisi.",
    hoursAgo: 1,
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000202",
    post: POSTS[0].id,
    author: `sari${SEED_DOMAIN}`,
    body: "Cek nomor pengirim di aplikasi ekspedisi resmi. Kalau resi tidak ada di sana, pesan itu tidak perlu ditanggapi.",
    hoursAgo: 1,
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000203",
    post: POSTS[1].id,
    author: `dimas${SEED_DOMAIN}`,
    body: "Suara bisa dikloning dari rekaman singkat. Bank asli tidak pernah meminta OTP lewat telepon, jadi tutup saja dan hubungi nomor di belakang kartu.",
    hoursAgo: 4,
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000204",
    post: POSTS[2].id,
    author: `ayu${SEED_DOMAIN}`,
    body: "Nama penerima di aplikasi adalah penentu terakhir sebelum bayar. Kalau bukan nama toko, batalkan walaupun nominalnya sudah muncul.",
    hoursAgo: 7,
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000205",
    post: POSTS[3].id,
    author: `rina${SEED_DOMAIN}`,
    body: "Pinjol legal punya izin OJK dan tidak meneror kontak. Simpan tangkapan layar ancamannya, lalu laporkan ke OJK dan polisi.",
    hoursAgo: 11,
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000206",
    post: POSTS[4].id,
    author: `bagas${SEED_DOMAIN}`,
    body: "Bayaran kecil di awal memang umpan. Begitu diminta menyetor uang untuk naik level, itu bukan pekerjaan lagi. Simpan bukti chat dan laporkan.",
    hoursAgo: 17,
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000207",
    post: POSTS[5].id,
    author: `sari${SEED_DOMAIN}`,
    body: "Buka aplikasi PLN resmi atau ketik alamatnya sendiri, jangan lewat tautan pesan. Tagihan yang asli selalu bisa dicek dari akunmu.",
    hoursAgo: 25,
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000208",
    post: POSTS[6].id,
    author: `ayu${SEED_DOMAIN}`,
    body: "Bansos tidak pernah memungut biaya atau meminta OTP. Kalau diminta foto KTP dan kode rahasia lewat chat, itu penipuan.",
    hoursAgo: 33,
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000209",
    post: POSTS[7].id,
    author: `dimas${SEED_DOMAIN}`,
    body: "Cek legalitas di OJK dan Bappebti sebelum menyetor. Transfer ke rekening pribadi adalah tanda paling jelas bahwa itu bukan investasi resmi.",
    hoursAgo: 44,
  },
  {
    id: "0c9a1a10-0000-4000-8000-000000000210",
    post: POSTS[8].id,
    author: `rina${SEED_DOMAIN}`,
    body: "Aktifkan verifikasi dua langkah dan jangan pernah membagikan kode enam digit. Kalau akun sudah diambil alih, segera hubungi dukungan WhatsApp dari perangkat lain.",
    hoursAgo: 59,
  },
];

const HELPFUL = [
  { post: POSTS[0].id, user: `bagas${SEED_DOMAIN}` },
  { post: POSTS[0].id, user: `sari${SEED_DOMAIN}` },
  { post: POSTS[0].id, user: `dimas${SEED_DOMAIN}` },
  { post: POSTS[1].id, user: `rina${SEED_DOMAIN}` },
  { post: POSTS[1].id, user: `ayu${SEED_DOMAIN}` },
  { post: POSTS[2].id, user: `rina${SEED_DOMAIN}` },
  { post: POSTS[2].id, user: `dimas${SEED_DOMAIN}` },
  { post: POSTS[3].id, user: `rina${SEED_DOMAIN}` },
  { post: POSTS[3].id, user: `ayu${SEED_DOMAIN}` },
  { post: POSTS[4].id, user: `bagas${SEED_DOMAIN}` },
  { post: POSTS[5].id, user: `sari${SEED_DOMAIN}` },
  { post: POSTS[6].id, user: `bagas${SEED_DOMAIN}` },
  { post: POSTS[7].id, user: `rina${SEED_DOMAIN}` },
  { post: POSTS[8].id, user: `sari${SEED_DOMAIN}` },
];

const reset = process.argv.includes("--reset");
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 2000,
});

try {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL required");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(7368414)");

    if (reset) {
      await client.query("DELETE FROM users WHERE email LIKE $1", [
        `%${SEED_DOMAIN}`,
      ]);
    }

    for (const member of MEMBERS) {
      await client.query(
        `INSERT INTO users (id, nama, email, password_hash, created_at)
         VALUES ($1, $2, $3, NULL, now()) ON CONFLICT (email) DO NOTHING`,
        [member.id, member.nama, member.email],
      );
    }

    const ids = new Map(
      (
        await client.query("SELECT id, email FROM users WHERE email LIKE $1", [
          `%${SEED_DOMAIN}`,
        ])
      ).rows.map((row) => [row.email, row.id]),
    );

    for (const post of POSTS) {
      const authorId = ids.get(post.author);
      if (!authorId) throw new Error(`Missing seed author ${post.author}`);
      const gallery = post.imageUrls ?? (post.imageUrl ? [post.imageUrl] : []);
      await client.query(
        `INSERT INTO community_posts
           (id, author_id, category, title, body, source_url, image_url, image_urls, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now() - $9 * interval '1 hour', now() - $9 * interval '1 hour')
         ON CONFLICT (id) DO UPDATE SET
           author_id=EXCLUDED.author_id,
           category=EXCLUDED.category,
           title=EXCLUDED.title,
           body=EXCLUDED.body,
           source_url=EXCLUDED.source_url,
           image_url=EXCLUDED.image_url,
           image_urls=EXCLUDED.image_urls,
           created_at=EXCLUDED.created_at,
           updated_at=EXCLUDED.updated_at`,
        [
          post.id,
          authorId,
          post.category,
          post.title,
          post.body,
          post.sourceUrl,
          gallery[0] ?? null,
          gallery,
          post.hoursAgo,
        ],
      );
    }

    for (const reply of REPLIES) {
      const authorId = ids.get(reply.author);
      if (!authorId) throw new Error(`Missing seed author ${reply.author}`);
      await client.query(
        `INSERT INTO community_replies
           (id, post_id, author_id, body, created_at, updated_at)
         VALUES ($1, $2, $3, $4, now() - $5 * interval '1 hour', now() - $5 * interval '1 hour')
         ON CONFLICT (id) DO UPDATE SET
           post_id=EXCLUDED.post_id,
           author_id=EXCLUDED.author_id,
           body=EXCLUDED.body,
           created_at=EXCLUDED.created_at,
           updated_at=EXCLUDED.updated_at`,
        [reply.id, reply.post, authorId, reply.body, reply.hoursAgo],
      );
    }

    for (const reaction of HELPFUL) {
      const userId = ids.get(reaction.user);
      if (!userId) throw new Error(`Missing seed author ${reaction.user}`);
      await client.query(
        `INSERT INTO community_helpful (post_id, user_id) VALUES ($1, $2)
         ON CONFLICT (post_id, user_id) DO NOTHING`,
        [reaction.post, userId],
      );
    }

    const counts = await client.query(
      `SELECT
         (SELECT count(*)::int FROM community_posts) AS posts,
         (SELECT count(*)::int FROM community_replies) AS replies,
         (SELECT count(*)::int FROM community_helpful) AS helpful`,
    );
    await client.query("COMMIT");
    const { posts, replies, helpful } = counts.rows[0];
    console.log(
      `Community demo data ready: ${MEMBERS.length} members, ${posts} posts, ${replies} replies, ${helpful} helpful reactions${reset ? " (reset first)" : ""}.`,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
} catch (error) {
  console.error("Community seed failed; check DATABASE_URL and migrations.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
