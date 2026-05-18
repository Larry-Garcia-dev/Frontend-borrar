import { UserRepository } from '../repositories/user.repository';
import { BcryptUtil } from '../utils/bcrypt.util';
import { JwtUtil } from '../utils/jwt.util';
import { GoogleUtil } from '../utils/google.util';

export class AuthService {
  
  static async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const user = await UserRepository.findByEmail(email);

    if (!user || !user.password_hash) {
      throw new Error('Credenciales incorrectas o cuenta configurada solo para Google.');
    }

    const isValid = await BcryptUtil.verify(password, user.password_hash);
    if (!isValid) {
      throw new Error('Credenciales incorrectas.');
    }

    if (!user.is_active) {
      throw new Error('Cuenta desactivada.');
    }

    const token = JwtUtil.generateToken(user.id);
    UserRepository.logActivity(user.id, 'LOGIN', ipAddress, userAgent).catch(console.error);

    return { token, user };
  }

  static async claimAccount(email: string, password: string, name: string, phone?: string, ipAddress?: string, userAgent?: string) {
    const user = await UserRepository.findByEmail(email);

    if (!user) {
      const pendingRequest = await UserRepository.findPendingRequestByEmail(email);
      if (pendingRequest) {
        throw new Error('Tu cuenta está actualmente en revisión por un administrador.');
      }
      throw new Error('Correo no encontrado. Un administrador debe crear tu solicitud primero.');
    }

    if (user.password_hash || user.google_id) {
      throw new Error('Esta cuenta ya fue registrada. Si olvidaste tu contraseña, contacta a soporte.');
    }

    const passwordHash = await BcryptUtil.hash(password);
    const updatedUser = await UserRepository.claimAccount(user.id, passwordHash, name, phone);

    const token = JwtUtil.generateToken(updatedUser.id);
    UserRepository.logActivity(updatedUser.id, 'REGISTER_CLAIMED', ipAddress, userAgent, 'USER').catch(console.error);

    return { token, user: updatedUser };
  }

  static async handleGoogleAuth(code: string, ipAddress?: string, userAgent?: string) {
    const googleUser = await GoogleUtil.exchangeCodeForUser(code);
    
    if (!googleUser.email) {
      throw new Error('Google no proporcionó un email.');
    }

    const emailDomain = googleUser.email.split('@')[1]?.toLowerCase();
    if (emailDomain !== 'macondosoftwares.com') {
      throw new Error('El inicio de sesión con Google está restringido a administradores (@macondosoftwares.com).');
    }

    let user = await UserRepository.findByEmail(googleUser.email);

    if (!user) {
      user = await UserRepository.createMacondoAdmin(
        googleUser.email,
        googleUser.sub,
        googleUser.name,
        googleUser.picture
      );
      UserRepository.logActivity(user.id, 'REGISTER', ipAddress, userAgent, 'MACONDO_ADMIN').catch(console.error);
    } else {
      user = await UserRepository.updateGoogleData(user.id, googleUser.sub, googleUser.name, googleUser.picture);
      UserRepository.logActivity(user.id, 'LOGIN', ipAddress, userAgent).catch(console.error);
    }

    if (!user.is_active) {
      throw new Error('Cuenta desactivada.');
    }

    const token = JwtUtil.generateToken(user.id);
    return { token, user };
  }
}