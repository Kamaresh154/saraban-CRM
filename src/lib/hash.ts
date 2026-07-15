import bcrypt from 'bcryptjs';

/**
 * Hashes a plain text password using bcryptjs.
 * @param password Plain text password
 * @returns Hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compares a plain text password against a bcrypt hash.
 * @param password Plain text password
 * @param hash Hashed password
 * @returns Promise boolean if matches
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
