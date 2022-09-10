import { BadRequestException, HttpStatus } from '@nestjs/common';

export class ValidationError extends BadRequestException {
  constructor(validationErrors: Record<string, string>) {
    super({
      error: 'VALIDATION_FAILED',
      validationErrors,
      statusCode: HttpStatus.BAD_REQUEST,
    });
  }
}
