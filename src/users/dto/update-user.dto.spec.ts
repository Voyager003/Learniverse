import { validate } from 'class-validator';
import { UpdateUserDto } from './update-user.dto.js';

describe('UpdateUserDto', () => {
  it('should pass validation with a valid name', async () => {
    const dto = new UpdateUserDto();
    dto.name = 'Updated Name';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should pass validation when name is omitted (all fields optional)', async () => {
    const dto = new UpdateUserDto();

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when name is too short', async () => {
    const dto = new UpdateUserDto();
    dto.name = '';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });

  it('should fail validation when name exceeds max length', async () => {
    const dto = new UpdateUserDto();
    dto.name = 'a'.repeat(51);

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('name');
  });
});
