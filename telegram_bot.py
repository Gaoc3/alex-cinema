import logging
import os
import sys
from pathlib import Path
import requests
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import Application, CommandHandler, ContextTypes

# UTF-8 Encoding Fix for Windows Console & Linux Terminals
if sys.platform.startswith("win"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# Configure Logging with Timestamps and File Output
logging.basicConfig(
    format="%(asctime)s - [%(levelname)s] - %(name)s - %(message)s",
    level=logging.INFO,
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("/root/.pm2/logs/telegram_bot_custom.log", encoding="utf-8", mode="a")
    ]
)
logger = logging.getLogger("AleXCinemaBot")

# python-telegram-bot uses HTTPX internally. Its INFO logs include the full Bot API
# URL, which contains the bot token, so keep transport logging at warning level.
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

def load_project_env() -> None:
    """Load server-side bot settings when PM2 starts outside the project directory."""
    env_path = Path(__file__).resolve().with_name(".env")
    if not env_path.is_file():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]
        if key:
            os.environ.setdefault(key, value)

load_project_env()

# Dedicated Telegram WebApp Routes & Bot Config
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
if not BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN is required")

WEB_APP_URL = os.environ.get("TELEGRAM_WEB_APP_URL", "https://cinax.live/tg-app")
DIRECT_HOME_URL = os.environ.get("TELEGRAM_HOME_URL", "https://cinax.live/home")

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Send welcoming message with Telegram WebApp Button"""
    user = update.effective_user
    first_name = user.first_name if user else "مستخدم"
    user_id = user.id if user else "Unknown"
    
    logger.info(f"Received /start command from User ID: {user_id} ({first_name})")
    
    welcome_text = (
        f"أهلاً بك يا {first_name} في منصة **AleX Cinema**! 🎬🍿\n\n"
        f"اضغط على الزر أدناه لفتح المنصة والتسجيل التلقائي المباشر بحساب تليجرام الخاص بك."
    )

    keyboard = [
        [
            InlineKeyboardButton(
                text="🎬 فتح منصة AleX Cinema (دخول مباشر)",
                web_app=WebAppInfo(url=WEB_APP_URL),
            )
        ],
        [
            InlineKeyboardButton(
                text="🌐 التوجه للموقع بالمتصفح",
                url=DIRECT_HOME_URL,
            )
        ],
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)

    # Force update chat menu button for this user
    try:
        chat_id = update.effective_chat.id if update.effective_chat else None
        if chat_id:
            res = requests.post(
                f"https://api.telegram.org/bot{BOT_TOKEN}/setChatMenuButton",
                json={
                    "chat_id": chat_id,
                    "menu_button": {
                        "type": "web_app",
                        "text": "🎬 AleX Cinema",
                        "web_app": {"url": WEB_APP_URL}
                    }
                },
                timeout=10
            )
            logger.info(f"setChatMenuButton response for {chat_id}: {res.status_code}")
    except Exception as e:
        logger.error(f"Error setting chat menu button for user {user_id}: {e}")

    await update.message.reply_text(
        welcome_text,
        reply_markup=reply_markup,
        parse_mode="Markdown"
    )

async def error_handler(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Log Errors caused by Updates."""
    logger.error(f"Update '{update}' caused error '{context.error}'", exc_info=context.error)

def main() -> None:
    """Start the bot."""
    logger.info("Starting AleX Cinema Telegram WebApp Bot...")
    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_error_handler(error_handler)

    logger.info("Bot is listening for events & updates...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()
