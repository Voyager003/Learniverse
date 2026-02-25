import { DataSource } from 'typeorm';
import { Role } from '../../src/common/enums';

export async function promoteToTutor(
  dataSource: DataSource,
  email: string,
): Promise<void> {
  await dataSource.query(`UPDATE users SET role = $1 WHERE email = $2`, [
    Role.TUTOR,
    email,
  ]);
}
