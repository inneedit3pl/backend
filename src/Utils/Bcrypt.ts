import bcrypt from "bcrypt";

export class Bcrypt {
  static async hashPassword(password: string) {
    return await bcrypt.hash(password, 10);
  }
  static async comparePassword(password: string, hashedPassword: string) {
    return await bcrypt.compare(password, hashedPassword);
  }
}
