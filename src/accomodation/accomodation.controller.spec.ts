import { Test, TestingModule } from '@nestjs/testing';
import { AccomodationController } from './accomodation.controller';

describe('AccomodationController', () => {
  let controller: AccomodationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccomodationController],
    }).compile();

    controller = module.get<AccomodationController>(AccomodationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
