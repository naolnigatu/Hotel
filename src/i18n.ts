import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translations
const resources = {
  en: {
    translation: {
      "hotel_name": "Woliso Hotel",
      "home": "Home",
      "rooms": "Rooms",
      "restaurant": "Restaurant",
      "book_now": "Book Now",
      "welcome": "Welcome to Woliso Hotel",
      "welcome_sub": "Experience luxury and comfort in the heart of Woliso, Ethiopia.",
      "featured_rooms": "Featured Rooms",
      "login": "Login",
      "dashboard": "Dashboard"
    }
  },
  am: {
    translation: {
      "hotel_name": "ወሊሶ ሆቴል",
      "home": "ዋና ገፅ",
      "rooms": "ክፍሎች",
      "restaurant": "ምግብ ቤት",
      "book_now": "አሁን ያስይዙ",
      "welcome": "እንኳን ወደ ወሊሶ ሆቴል በደህና መጡ",
      "welcome_sub": "በወሊሶ ከተማ እምብርት ላይ ምቾት እና ቅንጦትን ይለማመዱ።",
      "featured_rooms": "ተመራጭ ክፍሎች",
      "login": "ግባ",
      "dashboard": "ዳሽቦርድ"
    }
  },
  om: {
    translation: {
      "hotel_name": "Hoteela Walisoo",
      "home": "Fuula Duraa",
      "rooms": "Kutaalee",
      "restaurant": "Mana Nyaataa",
      "book_now": "Amma Ajajadhu",
      "welcome": "Baga gara Hoteela Walisoo nagaan dhuftan",
      "welcome_sub": "Giddugala magaalaa Walisoo keessatti boqonnaa fi qananii argadhaa.",
      "featured_rooms": "Kutaalee Filataman",
      "login": "Seeni",
      "dashboard": "Daashboordii"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: "en", // default language
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
