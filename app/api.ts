import { createStartAPIHandler, defaultAPIFileRouteHandler } from "@tanstack/start/api";
import { db } from "~/server/db";
import { user, gameSession } from "~/server/db/schema";
import { eq } from "drizzle-orm";


export default createStartAPIHandler(defaultAPIFileRouteHandler);
