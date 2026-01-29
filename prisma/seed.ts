import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { PrismaClient } from "@prisma/client"

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
})

const prisma = new PrismaClient({ adapter })

const securityQuestions = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What was the name of your elementary school?",
  "What is your mother's maiden name?",
  "What was the make of your first car?",
  "What is the name of your favorite childhood friend?",
  "What street did you grow up on?",
  "What was your childhood nickname?",
  "What is the middle name of your oldest sibling?",
  "What was the name of your first employer?",
  "What is your favorite movie?",
  "What is the name of your favorite sports team?",
  "What was your favorite food as a child?",
  "What is the name of the hospital where you were born?",
  "What is the name of your favorite book?",
]

async function main() {
  console.log("Seeding security questions...")

  for (const question of securityQuestions) {
    await prisma.securityQuestion.upsert({
      where: { question },
      update: {},
      create: { question },
    })
  }

  console.log(`Seeded ${securityQuestions.length} security questions`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
