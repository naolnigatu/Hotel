const fs = require('fs');
let file = fs.readFileSync('src/components/Footer.tsx', 'utf8');
file = file.replace(
  "  const [footerData, setFooterData] = useState<CmsFooter | null>(null);",
  "  const [footerData, setFooterData] = useState<CmsFooter | null>(null);\n  const [hotelName, setHotelName] = useState('');"
);
file = file.replace(
  "if (footerSnap.exists()) setFooterData(footerSnap.data().data as CmsFooter);",
  "if (footerSnap.exists()) setFooterData(footerSnap.data().data as CmsFooter);\n\n        const hotelRef = doc(db, 'app_settings', 'hotel');\n        const hotelSnap = await getDoc(hotelRef);\n        if (hotelSnap.exists() && hotelSnap.data().hotelName) {\n          setHotelName(hotelSnap.data().hotelName);\n        }"
);
file = file.replace(
  "  return (",
  "  const displayHotelName = hotelName || t('hotel_name');\n\n  return ("
);
file = file.replace(
  "{t('hotel_name')}",
  "{displayHotelName}"
);
file = file.replace(
  "{t('hotel_name')}",
  "{displayHotelName}"
);
fs.writeFileSync('src/components/Footer.tsx', file);
