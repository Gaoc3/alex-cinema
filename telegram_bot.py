import logging
import os
import sys
import asyncio
from pathlib import Path
from urllib.parse import urlparse

from telegram import (
    BotCommand,
    BotCommandScopeAllPrivateChats,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    MenuButtonDefault,
    MenuButtonWebApp,
    Update,
    WebAppInfo,
)
from telegram.ext import Application, CommandHandler, ContextTypes, filters


if sys.platform.startswith("win"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s",
    level=logging.INFO,
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("AleXCinemaBot")
BOT_ENV_KEYS = {
    "TELEGRAM_BOT_TOKEN",
    "TELEGRAM_WEB_APP_URL",
    "TELEGRAM_HOME_URL",
}

# HTTP transport logs can contain the Bot API URL, which includes the bot token.
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)


def load_project_env() -> None:
    """Load the project environment when PM2 starts from another directory."""
    project_dir = Path(__file__).resolve().parent
    for env_name in (".env.production", ".env"):
        env_path = project_dir / env_name
        if not env_path.is_file():
            continue

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            if key not in BOT_ENV_KEYS:
                continue
            value = value.strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
                value = value[1:-1]
            if key:
                # Explicit PM2 values remain authoritative; production env is
                # the first file fallback and local .env is the last one.
                os.environ.setdefault(key, value)


def require_https_url(env_name: str, default: str) -> str:
    value = os.environ.get(env_name, default).strip()
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc:
        raise RuntimeError(f"{env_name} must be a valid HTTPS URL")
    return value


load_project_env()

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
if not BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN is required")

WEB_APP_URL = require_https_url("TELEGRAM_WEB_APP_URL", "https://cinax.live/tg-app")
DIRECT_HOME_URL = require_https_url("TELEGRAM_HOME_URL", "https://cinax.live/home")


def web_app_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        [
            [
                InlineKeyboardButton(
                    text="🎬 فتح أليكس سينما",
                    web_app=WebAppInfo(url=WEB_APP_URL),
                )
            ],
            [InlineKeyboardButton(text="🌐 فتح الموقع", url=DIRECT_HOME_URL)],
        ]
    )


async def send_web_app(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    message = update.effective_message
    if message is None:
        return

    user = update.effective_user
    first_name = user.first_name.strip() if user and user.first_name else "بك"
    logger.info("WebApp requested")

    # Remove the old per-chat override created by previous bot versions so the
    # globally configured WebApp menu button becomes effective.
    if update.effective_chat:
        try:
            await context.bot.set_chat_menu_button(
                chat_id=update.effective_chat.id,
                menu_button=MenuButtonDefault(),
            )
        except Exception as error:
            logger.warning("Could not reset legacy chat menu: %s", type(error).__name__)

    await message.reply_text(
        f"أهلًا {first_name} 👋\nافتح المنصة من الزر أدناه.",
        reply_markup=web_app_keyboard(),
    )


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await send_web_app(update, context)


async def app_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await send_web_app(update, context)


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    del context
    message = update.effective_message
    if message is None:
        return

    await message.reply_text(
        "افتح المنصة من الزر أدناه.\nإذا بدّلت حساب تليجرام، أغلق الويب آب وافتحه من الحساب الجديد.",
        reply_markup=web_app_keyboard(),
    )


async def configure_bot(application: Application) -> None:
    """Configure Telegram's command list and persistent WebApp menu button."""
    commands = [
        BotCommand("start", "فتح أليكس سينما"),
        BotCommand("app", "فتح المنصة"),
        BotCommand("help", "مساعدة"),
    ]

    settings = [
        (
            "default command cleanup",
            lambda: application.bot.delete_my_commands(),
        ),
        (
            "commands",
            lambda: application.bot.set_my_commands(
                commands,
                scope=BotCommandScopeAllPrivateChats(),
            ),
        ),
        (
            "menu",
            lambda: application.bot.set_chat_menu_button(
                menu_button=MenuButtonWebApp(
                    text="فتح المنصة",
                    web_app=WebAppInfo(url=WEB_APP_URL),
                )
            ),
        ),
        (
            "short description",
            lambda: application.bot.set_my_short_description(
                "شاهد أليكس سينما من داخل تليجرام."
            ),
        ),
        (
            "description",
            lambda: application.bot.set_my_description(
                "افتح منصة أليكس سينما وسجّل الدخول تلقائيًا بحساب تليجرام الحالي."
            ),
        ),
    ]

    configured = 0
    for setting_name, apply_setting in settings:
        for attempt in range(1, 4):
            try:
                await apply_setting()
                configured += 1
                break
            except Exception as error:
                if attempt == 3:
                    logger.warning(
                        "Optional bot %s configuration failed after retries: %s",
                        setting_name,
                        type(error).__name__,
                    )
                else:
                    await asyncio.sleep(attempt)

    logger.info("Configured %s/%s optional bot settings", configured, len(settings))


async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    del update
    error = context.error
    exc_info = (type(error), error, error.__traceback__) if error else None
    logger.error("Unhandled bot update error: %s", error, exc_info=exc_info)


def main() -> None:
    logger.info("Starting AleX Cinema Telegram WebApp bot")
    app = Application.builder().token(BOT_TOKEN).post_init(configure_bot).build()

    private_chats = filters.ChatType.PRIVATE
    app.add_handler(CommandHandler("start", start, filters=private_chats))
    app.add_handler(CommandHandler("app", app_command, filters=private_chats))
    app.add_handler(CommandHandler("help", help_command, filters=private_chats))
    app.add_error_handler(error_handler)

    logger.info("Bot is listening for messages")
    app.run_polling(allowed_updates=["message"])


if __name__ == "__main__":
    main()
