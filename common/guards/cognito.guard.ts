import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  private verifier = CognitoJwtVerifier.create({
    userPoolId: 'eu-west-2_da42rQKXJ',
    tokenUse: 'id', // or 'access'
    clientId: '5qmvgh6dtlputqh38pbb68aurk',
  });

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) return false;
    const token = authHeader.replace('Bearer ', '');

    try {
      const payload = await this.verifier.verify(token);
      // console.log('JWT payload:', payload);
      request.user = payload; // attach claims to request
      return true;
    } catch (err) {
      console.error('JWT verification failed:', err);
      return false;
    }
  }
}
