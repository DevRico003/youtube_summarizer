export default {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Use process.env instead of env() to allow builds without DATABASE_URL
    // (e.g., during Docker image build where DB connection isn't needed)
    url: process.env.DATABASE_URL ?? 'file:./dev.db',
  },
}
