import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 8080;

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    }),
  );

  // app.enableCors();
  app.enableCors({
    origin: [process.env.FRONTEND_URL,process.env.FRONTEND_LOCAL_URL], // Replace with your React app's Vercel URL
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // Set a global prefix for all routes (e.g., /api)
  app.setGlobalPrefix('api'); // This adds 'api/' to all routes

  //validating incoming request globally
  app.useGlobalPipes(
    new ValidationPipe({
      //remove any properties that are not part of the dto
      whitelist: true,
    }),
  );

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: ['1'],
  });

  const options = new DocumentBuilder()
    .setTitle('Appointment')
    .setDescription('The Api document')
    .setVersion('v1')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, options);

  SwaggerModule.setup('/docs', app, document);

  await app.listen(process.env.PORT || 8080, () => {
    console.log('Server is running at ' + port);
  });
}
bootstrap();
