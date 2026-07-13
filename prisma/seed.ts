import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const roomCount = await prisma.room.count();

  console.log(
    `운영 모드: seed 데이터 생성은 비활성화되어 있습니다. 현재 Room 데이터: ${roomCount}개`
  );
  console.log("기존 운영 데이터는 삭제하거나 덮어쓰지 않습니다.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
