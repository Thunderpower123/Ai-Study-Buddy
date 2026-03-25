// DB_NAME is the only app-level constant that doesn't belong in .env
// because it's not a secret and it doesn't change between environments
// for this project. If you ever need separate dev/prod databases,
// move this to .env and read it via process.env.DB_NAME.
export const DB_NAME = "ai-study-buddy";
