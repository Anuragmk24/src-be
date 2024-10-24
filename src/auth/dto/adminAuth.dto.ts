import { IsString } from "class-validator";

export class AdminPayloadDto {
    @IsString()
    username :string;

    @IsString()
    password:string;
}