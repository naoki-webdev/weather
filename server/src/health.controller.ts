import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  @Get("up")
  show() {
    return { status: "ok" };
  }
}
