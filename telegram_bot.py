import logging
import os
import sys
import urllib.parse
from pathlib import Path

import requests
import telebot
from telebot import types
from telebot.types import (
    BotCommand,
    BotCommandScopeAllPrivateChats,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    MenuButtonWebApp,
    ReplyKeyboardMarkup,
    WebAppInfo,
)

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


def load_project_env() -> None:
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
                os.environ.setdefault(key, value)


load_project_env()

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "8814857532:AAGE_ATYqwGOXbBSD-g6GHcvBCeSlxKZg1I")
WEB_APP_URL = "https://t.me/outhcinax_bot/cinema"
MINI_APP_DIRECT_URL = "https://t.me/outhcinax_bot/cinema"
INTERNAL_API_BASE = "http://127.0.0.1:3000/api/bot"

bot = telebot.TeleBot(BOT_TOKEN, parse_mode="HTML")

USER_SEARCH_CACHE = {}


def fetch_api(action: str, params: dict = None) -> dict:
    if params is None:
        params = {}
    params["action"] = action
    try:
        res = requests.get(INTERNAL_API_BASE, params=params, timeout=5)
        if res.ok:
            return res.json()
    except Exception as e:
        logger.error("API Fetch Error for action %s: %s", action, e)
    return {}


def main_inline_markup() -> InlineKeyboardMarkup:
    markup = InlineKeyboardMarkup()
    markup.row(
        InlineKeyboardButton(
            text="▶️ شاهد الآن",
            url="https://t.me/outhcinax_bot/cinema",
        )
    )
    markup.row(
        InlineKeyboardButton(text="🔥 أحدث الأفلام", callback_data="btn_movies"),
        InlineKeyboardButton(text="📺 أحدث المسلسلات", callback_data="btn_series"),
    )
    markup.row(
        InlineKeyboardButton(text="🎭 التصنيفات", callback_data="btn_categories"),
        InlineKeyboardButton(text="🔍 بحث فوري", callback_data="btn_search"),
    )
    return markup


def format_card_caption(item: dict) -> str:
    title = item.get("ar_title") or item.get("en_title") or "بدون عنوان"
    en_title = item.get("en_title", "")
    year = item.get("year", "")
    stars = item.get("stars", "0")
    is_series = str(item.get("kind")) == "2"
    kind_badge = "📺 مسلسل" if is_series else "🎬 فيلم"
    desc = item.get("ar_content", "")
    if desc and len(desc) > 160:
        desc = desc[:155] + "..."

    caption = f"<b>[{kind_badge}] {title}</b>\n"
    if en_title and en_title.lower() != title.lower():
        caption += f"<i>{en_title}</i>\n"
    caption += f"──────────────\n"
    caption += f"⭐ التقييم: <b>{stars} / 10</b> | 📅 السنة: <b>{year}</b>\n"
    if desc:
        caption += f"\n{desc}\n"
    return caption


def make_movie_card_markup(item: dict) -> InlineKeyboardMarkup:
    nb = item.get("nb") or item.get("id")
    title = item.get("ar_title") or "العمل"
    kind = str(item.get("kind", "1"))
    markup = InlineKeyboardMarkup()

    direct_share_url = f"https://t.me/outhcinax_bot/cinema?startapp={nb}"

    if kind == "2":
        markup.row(
            InlineKeyboardButton(
                text="▶️ شاهد الآن",
                url=direct_share_url,
            )
        )
        markup.row(
            InlineKeyboardButton(
                text="📺 قائمة الحلقات",
                callback_data=f"eps_{nb}",
            ),
            InlineKeyboardButton(
                text="🍿 مشاركة",
                url=f"https://t.me/share/url?url={urllib.parse.quote(direct_share_url)}&text={urllib.parse.quote(f'شاهد {title} بدقة 4K على AleX Cinema 🎬')}",
            ),
        )
    else:
        markup.row(
            InlineKeyboardButton(
                text="▶️ شاهد الآن",
                url=direct_share_url,
            )
        )
        markup.row(
            InlineKeyboardButton(
                text="🍿 مشاركة العمل",
                url=f"https://t.me/share/url?url={urllib.parse.quote(direct_share_url)}&text={urllib.parse.quote(f'شاهد {title} بدقة 4K على AleX Cinema 🎬')}",
            )
        )

    return markup


@bot.message_handler(commands=["start", "app"])
def send_welcome(message):
    # Force this private chat's menu button to the official Mini App URL on every /start.
    try:
        bot.set_chat_menu_button(
            chat_id=message.chat.id,
            menu_button=MenuButtonWebApp(
                type="web_app",
                text="السينما 🎬",
                web_app=WebAppInfo(url="https://t.me/outhcinax_bot/cinema"),
            ),
        )
    except Exception as e:
        logger.warning("Failed to force menu button for chat %s: %s", message.chat.id, e)

    try:
        cleanup = bot.send_message(
            message.chat.id,
            "✨",
            reply_markup=types.ReplyKeyboardRemove(),
        )
        bot.delete_message(message.chat.id, cleanup.message_id)
    except Exception:
        pass

    first_name = message.from_user.first_name.strip() if message.from_user and message.from_user.first_name else "بك"
    welcome_text = (
        f"أهلاً <b>{first_name}</b> في <b>AleX Cinema</b> 🎬🍿\n\n"
        f"✨ منصتك المتكاملة لمشاهدة أضخم مكتبة أفلام ومسلسلات بدقة 4K مجاناً وبدون أي إعلانات.\n\n"
        f"👇 <b>اضغط على الزر أدناه لفتح السينما مباشرة:</b>"
    )
    logo_path = Path(__file__).resolve().parent / "public" / "logo.png"
    try:
        if logo_path.is_file():
            with open(logo_path, "rb") as photo:
                bot.send_photo(
                    message.chat.id,
                    photo,
                    caption=welcome_text,
                    reply_markup=main_inline_markup(),
                )
                return
    except Exception as e:
        logger.warning("Failed to send logo photo: %s", e)

    bot.send_message(
        message.chat.id,
        welcome_text,
        reply_markup=main_inline_markup(),
    )


@bot.callback_query_handler(func=lambda call: call.data == "btn_search")
def callback_btn_search(call):
    try:
        bot.answer_callback_query(call.id, text="🔎 أرسل اسم العمل للبحث عنه...")
    except Exception:
        pass
    msg = bot.send_message(
        call.message.chat.id,
        "🔎 <b>البحث الفوري في AleX Cinema 🍿</b>\n\n"
        "✍️ <b>أرسل اسم الفيلم أو المسلسل الذي تبحث عنه الآن في المحادثة:</b>\n"
        "<i>(مثال: The Punisher أو Friends أو قيامة عثمان)</i>",
    )
    bot.register_next_step_handler(msg, process_search_query)


@bot.message_handler(commands=["search"])
def command_search(message):
    msg = bot.send_message(
        message.chat.id,
        "🔎 <b>البحث الفوري في AleX Cinema 🍿</b>\n\n"
        "✍️ <b>أرسل اسم الفيلم أو المسلسل الذي تبحث عنه الآن في المحادثة:</b>\n"
        "<i>(مثال: The Punisher أو Friends أو قيامة عثمان)</i>",
    )
    bot.register_next_step_handler(msg, process_search_query)


def process_search_query(message):
    query = (message.text or "").strip()
    if not query or query.startswith("/"):
        return

    bot.send_chat_action(message.chat.id, "typing")
    data = fetch_api("search", {"q": query})
    results = data.get("results", [])

    if not results:
        bot.reply_to(
            message,
            f"❌ لم يتم العثور على أي نتائج مطابقة لـ <b>'{query}'</b>.\n"
            f"💡 يرجى التأكد من كتابة الاسم بشكل صحيح والمحاولة مجدداً.",
            reply_markup=main_inline_markup(),
        )
        return

    user_id = message.from_user.id
    USER_SEARCH_CACHE[user_id] = {
        "query": query,
        "results": results,
        "offset": 0,
    }

    send_search_results_page(message.chat.id, user_id, 0)


def send_search_results_page(chat_id, user_id, offset):
    cache = USER_SEARCH_CACHE.get(user_id)
    if not cache:
        return

    results = cache["results"]
    query = cache["query"]
    page_items = results[offset : offset + 4]

    if offset == 0:
        bot.send_message(
            chat_id,
            f"🍿 <b>نتائج البحث عن: '{query}' ({len(results)} عمل):</b>",
        )

    for item in page_items:
        caption = format_card_caption(item)
        markup = make_movie_card_markup(item)
        img_url = item.get("imgUrl")

        try:
            if img_url and img_url.startswith("http"):
                bot.send_photo(chat_id, img_url, caption=caption, reply_markup=markup)
            else:
                bot.send_message(chat_id, caption, reply_markup=markup)
        except Exception as e:
            logger.warning("Error sending photo: %s", e)
            bot.send_message(chat_id, caption, reply_markup=markup)

    next_offset = offset + 4
    if next_offset < len(results):
        nav_markup = InlineKeyboardMarkup()
        nav_markup.row(
            InlineKeyboardButton(
                text=f"➕ عرض المزيد ({len(results) - next_offset} متبقي)",
                callback_data=f"more_{next_offset}",
            )
        )
        bot.send_message(chat_id, "باقي النتائج:", reply_markup=nav_markup)


@bot.callback_query_handler(func=lambda call: call.data.startswith("more_"))
def handle_more_results(call):
    offset = int(call.data.replace("more_", ""))
    user_id = call.from_user.id
    try:
        bot.answer_callback_query(call.id, text="⏳ جاري جلب المزيد من النتائج...")
    except Exception:
        pass
    send_search_results_page(call.message.chat.id, user_id, offset)


@bot.callback_query_handler(func=lambda call: call.data == "btn_movies")
def callback_btn_movies(call):
    try:
        bot.answer_callback_query(call.id, text="⏳ جاري تحميل الأفلام...")
    except Exception:
        pass
    chat_id = call.message.chat.id
    bot.send_chat_action(chat_id, "typing")
    data = fetch_api("popular", {"type": "movies", "page": 1})
    results = data.get("results", [])

    if not results:
        bot.send_message(chat_id, "❌ تعذر جلب قائمة الأفلام حالياً، يرجى المحاولة لاحقاً.")
        return

    bot.send_message(
        chat_id,
        "🔥 <b>أحدث الأفلام الحصرية في AleX Cinema 🍿</b>\n<i>(اضغط على '▶️ شاهد الآن' لتشغيل الفيلم فوراً بدقة 4K):</i>",
    )
    for item in results[:4]:
        caption = format_card_caption(item)
        markup = make_movie_card_markup(item)
        img_url = item.get("imgUrl")
        try:
            if img_url and img_url.startswith("http"):
                bot.send_photo(chat_id, img_url, caption=caption, reply_markup=markup)
            else:
                bot.send_message(chat_id, caption, reply_markup=markup)
        except Exception:
            bot.send_message(chat_id, caption, reply_markup=markup)


@bot.message_handler(commands=["movies"])
def command_movies(message):
    chat_id = message.chat.id
    bot.send_chat_action(chat_id, "typing")
    data = fetch_api("popular", {"type": "movies", "page": 1})
    results = data.get("results", [])

    if not results:
        bot.send_message(chat_id, "❌ تعذر جلب قائمة الأفلام حالياً، يرجى المحاولة لاحقاً.")
        return

    bot.send_message(
        chat_id,
        "🔥 <b>أحدث الأفلام الحصرية في AleX Cinema 🍿</b>\n<i>(اضغط على '▶️ شاهد الآن' لتشغيل الفيلم فوراً بدقة 4K):</i>",
    )
    for item in results[:4]:
        caption = format_card_caption(item)
        markup = make_movie_card_markup(item)
        img_url = item.get("imgUrl")
        try:
            if img_url and img_url.startswith("http"):
                bot.send_photo(chat_id, img_url, caption=caption, reply_markup=markup)
            else:
                bot.send_message(chat_id, caption, reply_markup=markup)
        except Exception:
            bot.send_message(chat_id, caption, reply_markup=markup)


@bot.callback_query_handler(func=lambda call: call.data == "btn_series")
def callback_btn_series(call):
    try:
        bot.answer_callback_query(call.id, text="⏳ جاري تحميل المسلسلات...")
    except Exception:
        pass
    chat_id = call.message.chat.id
    bot.send_chat_action(chat_id, "typing")
    data = fetch_api("popular", {"type": "series", "page": 1})
    results = data.get("results", [])

    if not results:
        bot.send_message(chat_id, "❌ تعذر جلب قائمة المسلسلات حالياً، يرجى المحاولة لاحقاً.")
        return

    bot.send_message(
        chat_id,
        "📺 <b>أشهر المسلسلات الحصرية في AleX Cinema 🍿</b>\n<i>(اختر المسلسل لعرض الحلقات أو المشاهدة المباشرة):</i>",
    )
    for item in results[:4]:
        caption = format_card_caption(item)
        markup = make_movie_card_markup(item)
        img_url = item.get("imgUrl")
        try:
            if img_url and img_url.startswith("http"):
                bot.send_photo(chat_id, img_url, caption=caption, reply_markup=markup)
            else:
                bot.send_message(chat_id, caption, reply_markup=markup)
        except Exception:
            bot.send_message(chat_id, caption, reply_markup=markup)


@bot.message_handler(commands=["series"])
def command_series(message):
    chat_id = message.chat.id
    bot.send_chat_action(chat_id, "typing")
    data = fetch_api("popular", {"type": "series", "page": 1})
    results = data.get("results", [])

    if not results:
        bot.send_message(chat_id, "❌ تعذر جلب قائمة المسلسلات حالياً، يرجى المحاولة لاحقاً.")
        return

    bot.send_message(
        chat_id,
        "📺 <b>أشهر المسلسلات الحصرية في AleX Cinema 🍿</b>\n<i>(اختر المسلسل لعرض الحلقات أو المشاهدة المباشرة):</i>",
    )
    for item in results[:4]:
        caption = format_card_caption(item)
        markup = make_movie_card_markup(item)
        img_url = item.get("imgUrl")
        try:
            if img_url and img_url.startswith("http"):
                bot.send_photo(chat_id, img_url, caption=caption, reply_markup=markup)
            else:
                bot.send_message(chat_id, caption, reply_markup=markup)
        except Exception:
            bot.send_message(chat_id, caption, reply_markup=markup)


@bot.callback_query_handler(func=lambda call: call.data == "btn_categories")
def show_categories(call):
    chat_id = call.message.chat.id
    try:
        bot.answer_callback_query(call.id, text="⏳ جاري تحميل التصنيفات...")
    except Exception:
        pass

    bot.send_chat_action(chat_id, "typing")
    data = fetch_api("categories")
    categories = data.get("categories", [])

    if not categories:
        bot.send_message(chat_id, "❌ تعذر جلب التصنيفات حالياً.")
        return

    markup = InlineKeyboardMarkup(row_width=2)
    buttons = [
        InlineKeyboardButton(text=f"🎬 {c.get('ar_title', 'تصنيف')}", callback_data=f"cat_{c.get('id')}")
        for c in categories[:10]
    ]
    markup.add(*buttons)

    bot.send_message(
        chat_id,
        "🎭 <b>تصفح أقسام وتصنيفات AleX Cinema 🎬</b>\n<i>اختر القسم المفضل لديك لعرض الأفلام والمسلسلات:</i>",
        reply_markup=markup,
    )


@bot.callback_query_handler(func=lambda call: call.data.startswith("cat_"))
def handle_category_click(call):
    cat_id = call.data.replace("cat_", "")
    try:
        bot.answer_callback_query(call.id, text="⏳ جاري تحميل أعمال القسم...")
    except Exception:
        pass

    bot.send_chat_action(call.message.chat.id, "typing")
    data = fetch_api("category_items", {"id": cat_id, "kind": "1"})
    results = data.get("results", [])

    if not results:
        bot.send_message(call.message.chat.id, "❌ لا توجد أعمال في هذا القسم حالياً.")
        return

    bot.send_message(call.message.chat.id, "🍿 <b>أفلام القسم المختار:</b>")
    for item in results[:4]:
        caption = format_card_caption(item)
        markup = make_movie_card_markup(item)
        img_url = item.get("imgUrl")
        try:
            if img_url and img_url.startswith("http"):
                bot.send_photo(call.message.chat.id, img_url, caption=caption, reply_markup=markup)
            else:
                bot.send_message(call.message.chat.id, caption, reply_markup=markup)
        except Exception:
            bot.send_message(call.message.chat.id, caption, reply_markup=markup)


@bot.callback_query_handler(func=lambda call: call.data.startswith("eps_"))
def handle_episodes_list(call):
    series_id = call.data.replace("eps_", "")
    try:
        bot.answer_callback_query(call.id, text="⏳ جاري جلب حلقات المسلسل...")
    except Exception:
        pass

    bot.send_chat_action(call.message.chat.id, "typing")
    data = fetch_api("details", {"id": series_id})
    video = data.get("video", {})
    episodes = video.get("episodes", [])

    if not episodes:
        bot.send_message(call.message.chat.id, "❌ لم يتم العثور على حلقات لهذا المسلسل.")
        return

    markup = InlineKeyboardMarkup(row_width=3)
    buttons = []
    for ep in episodes[:24]:
        ep_num = ep.get("episodeNummer") or ep.get("nb")
        ep_url = f"https://t.me/outhcinax_bot/cinema?startapp={series_id}"
        buttons.append(
            InlineKeyboardButton(
                text=f"حلقة {ep_num} 🎬",
                url=ep_url,
            )
        )
    markup.add(*buttons)

    bot.send_message(
        call.message.chat.id,
        f"📺 <b>قائمة حلقات مسلسل: {video.get('ar_title', 'المسلسل')} 🍿</b>\n<i>اختر الحلقة للمشاهدة فوراً:</i>",
        reply_markup=markup,
    )


@bot.message_handler(commands=["help"])
def send_help(message):
    help_text = (
        "💡 <b>تعليمات استخدام البوت:</b>\n\n"
        "• <b>فتح السينما:</b> اضغط على زر (السينما 🎬) في الأسفل أو في الرسالة لفتح المشغل الكامل.\n"
        "• <b>البحث:</b> اكتب اسم أي فيلم أو مسلسل في المحادثة مباشرة.\n"
        "• <b>التصنيفات:</b> اختر قسمك المفضل واستعرض أحدث الأفلام والمسلسلات."
    )
    bot.reply_to(message, help_text, reply_markup=main_inline_markup())


@bot.message_handler(func=lambda msg: True and not msg.text.startswith("/"))
def direct_text_search(message):
    process_search_query(message)


def configure_bot():
    # Force the GLOBAL/default menu button for the entire bot, then verify what
    # Telegram actually stored.  This does not depend on /start being pressed.
    try:
        bot.set_chat_menu_button(
            menu_button=MenuButtonWebApp(
                type="web_app",
                text="السينما 🎬",
                web_app=WebAppInfo(url=MINI_APP_DIRECT_URL),
            )
        )

        current = bot.get_chat_menu_button()
        logger.info(
            "Global menu button after update: type=%s text=%s web_app=%s",
            getattr(current, "type", None),
            getattr(current, "text", None),
            getattr(getattr(current, "web_app", None), "url", None),
        )

        actual_url = getattr(getattr(current, "web_app", None), "url", None)
        actual_text = getattr(current, "text", None)
        if actual_url != MINI_APP_DIRECT_URL or actual_text != "السينما 🎬":
            logger.error(
                "Telegram did not store the expected GLOBAL menu button: %r",
                current,
            )
        else:
            logger.info("GLOBAL menu button is correctly forced to %s", MINI_APP_DIRECT_URL)
    except Exception as e:
        logger.exception("Failed to force/verify GLOBAL menu button: %s", e)

    try:
        commands = [
            BotCommand("start", "🎬 القائمة الرئيسية وفتح المنصة"),
            BotCommand("search", "🔍 بحث فوري عن فيلم أو مسلسل"),
            BotCommand("movies", "🔥 أحدث الأفلام الحصرية"),
            BotCommand("series", "📺 أحدث المسلسلات"),
            BotCommand("help", "💡 مساعدة ودليل الاستخدام"),
        ]
        bot.set_my_commands(commands, scope=BotCommandScopeAllPrivateChats())
    except Exception as e:
        logger.warning("Failed to set commands: %s", e)


def main():
    logger.info("Starting AleX Cinema Production Telegram Bot...")
    try:
        bot.delete_webhook(drop_pending_updates=True)
    except Exception as e:
        logger.warning("delete_webhook: %s", e)

    configure_bot()
    logger.info("Bot is active and listening with all allowed updates!")
    bot.infinity_polling(
        timeout=10,
        long_polling_timeout=5,
        allowed_updates=[
            "message",
            "edited_message",
            "callback_query",
            "inline_query",
            "chosen_inline_result",
            "my_chat_member",
            "chat_member",
        ],
    )


if __name__ == "__main__":
    main()
