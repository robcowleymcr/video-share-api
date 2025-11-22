import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  private verifier = CognitoJwtVerifier.create({
    userPoolId: 'eu-west-2_zDBv1379J',
    tokenUse: 'access',
    clientId: '2vibs3do5os9j29qmat9qhml6c',
  });

  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      return false;
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const payload = await this.verifier.verify(token);
      request.user = payload;
      return true;
    } catch (err) {
      return false;
    }
  }
}
