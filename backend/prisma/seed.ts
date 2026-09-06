import { LocationType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertLocation(
  name: string,
  type: LocationType,
  parentId: string | null,
) {
  const existing = await prisma.location.findFirst({
    where: { name, type, parentId },
  });
  if (existing) return existing;
  return prisma.location.create({ data: { name, type, parentId } });
}

async function main() {
  const peru = await upsertLocation('Perú', LocationType.PAIS, null);
  const limaRegion = await upsertLocation('Lima', LocationType.REGION, peru.id);
  const limaProvincia = await upsertLocation(
    'Lima',
    LocationType.PROVINCIA,
    limaRegion.id,
  );
  const luriganchoChosica = await upsertLocation(
    'Lurigancho-Chosica',
    LocationType.DISTRITO,
    limaProvincia.id,
  );
  await upsertLocation('Chosica', LocationType.ZONA, luriganchoChosica.id);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
