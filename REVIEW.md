# Review guide for a teacher or subject expert

Thank you for reviewing History Globe. This guide shows **where to look first** and **how to fix things**.

## What the app contains
- 499 civilisations and peoples, each with 43 checklist items in 10 categories, a “Known for” list and (where available) territory and population charts.
- Events, routes, people and stories in `src/data/`.
- Every checklist item has a **certainty** (confirmed / estimated / disputed) and a **source**.
  Totals: 2853 confirmed, 2693 estimated, 317 disputed.

## How facts were checked so far
1. **Wikipedia** (infobox and lead), read on 5–6 Nov 2026. Items labelled “(checked …)” were confirmed there.
2. **Wikidata** cross-check of start/end dates and capitals for every civilisation: 83% of dates agree; every difference was reviewed (see `reports/wikidata-crosscheck.md`).
3. **Britannica** spot-check of 4 civilisations (see `reports/britannica-spotcheck.md`). Britannica blocks automated access, so the rest need a person.
4. **Wikipedia full-article pass (from 8 Nov 2026, issue #4):** each item is compared with the whole article; only items the article supports are marked “(checked 8 Nov 2026)”, and wrong figures are corrected (e.g. UK and Australian population, Papua 1905). Done so far: 16 countries in batches 1–2 and 6–7, the 12 round-13 medieval entries in batches 3–5, and more countries from batch 8 on (see the “Wikipedia check” pull requests; the running total is in PROGRESS.md). Items the article does not cover stay unchecked.
5. Items that cite a book but no “checked” Wikipedia page were written from general knowledge and marked *estimated*: **these are the ones most worth checking.**

## Priority 0 — added 6 Nov 2026, not yet checked against a source
These were written from general knowledge (sources named, but no page was re-read), so every fact needs a second look:
- **21 new entries:** Russian Federation, Canada, Brazil (Republic), Australia, Argentina, Mexico, Modern Egypt, Grand Duchy of Moscow & Tsardom of Russia, Kazakh Khanate, Khanates of Bukhara, Khiva and Kokand, Tibet (842–1951), Saudi States & Saudi Arabia, Makuria, Scythians and Saka, Kalmar Union & Denmark–Norway, Khoisan peoples, Bantu-speaking peoples, Inuit and Arctic peoples, Indigenous peoples of Siberia, Peoples of the Great Plains, Indigenous peoples of Amazonia.
- **About 1,250 short checklist answers were expanded** across 135 older entries (mostly the newer ones such as Valdivia, Nazca, Funan, Goguryeo, Toltec, the Philippines and Singapore). The year, certainty and source of each item were kept.
- **13 more entries (round 2 of map blanks):** West African farming peoples, First Nations of the Subarctic, Amazigh (Berber) and Saharan peoples, Sámi and Finno-Ugric peoples, Peoples of the Eastern Woodlands, Peoples of the North American West, Peoples of the Brazilian Highlands, Peoples of the Pampas, Patagonia and the southern Andes, Peru, Colombia, Mongolia, Sudan, Algeria.
- **Map gaps round 11 (16 full entries):** Southern Ming and Tungning, Ava and Hanthawaddy, pre-colonial Philippine states, Malla Nepal, Ibadi Imamate of Oman, Dendi (Songhai successor), Kuba, Ovimbundu kingdoms, Yeke (Msiri), Nyamwezi states (Mirambo), Utetera (Tippu Tip), Teke (Anziku), Yaka, Borgu, Rabih az-Zubayr’s state, Xhosa; plus 17 events, 9 people, 28 links. Several Central African entries rely on thin sources (many answers marked estimated).
- **Medieval map gaps round 13 (12 full entries):** Avar Khaganate, Pechenegs, Magyar principality (before 1000), Oghuz Yabgu, Uyghur kingdoms (Qocho and Gansu), Mongol tribes before 1206, Early Slavs, Ostrogothic Kingdom, Yamato Japan, Chenla, East Javanese kingdoms (Kediri, Singhasari), Sixteen Kingdoms; plus 15 events, 7 people, 25 links. Map name windows added: Meroe (Kush), Seljuk Caliphate, Pagan, Other Rus Principalities, Pallavas/Chalukyas/Pratiharas/Rashtrakutas/Vakatakas (Regional kingdoms of India), Sasanian dependencies, Karluks (Kara-Khanids). Check: “Karluks” 840–999 given to the Kara-Khanids, and “Ostrogoths” before 493 given to the Ostrogothic Kingdom entry.
- **Americas round 12 (6 entries, 178 more 1492 links):** Peoples of California, Peoples of the Southwest, Postclassic Maya, Mesoamerican peoples outside the Aztec Empire, Peoples of northern Mexico (Aridoamerica), Isthmo-Colombian peoples; 12 events, 6 people, 10 links. 178 more 1492 names linked with the same category check plus a Wikipedia search step (evidence added to `scripts/indigenous-links-1492.tsv`); 15 doubtful matches were rejected by hand. Popé (Pueblo Revolt) moved from the Ancestral Puebloans to the Southwest entry.
- **1492 Indigenous nations (180 links):** names on the 1492/1500 maps were linked to a culture-area entry only when the nation’s own Wikipedia article is in a matching category (e.g. “Indigenous peoples of the Northeastern Woodlands”, “Plains tribes”). The evidence for each link (map name, article, category, entry) is in `scripts/indigenous-links-1492.tsv`. About 1,000 names (mostly own-language names) stay unlinked until someone matches them by hand.
- **Map gaps round 10 (24 full entries):** Visigothic Kingdom, Merovingian Franks, Umayyad Córdoba, Castile, Aragon, Almoravids, Idrisids and Aghlabids, Maghreb sultanates (Marinid, Zayyanid, Wattasid, Saadi), medieval Hungary, Sweden and Norway, Novgorod, Teutonic Order, Tatar khanates (Kazan, Astrakhan, Sibir, Nogai), Kara Koyunlu and Aq Qoyunlu, Oirats and Dzungars, Japan 1185–1603, Bengal Sultanate, Bahmani and Deccan sultanates, Iranian dynasties (Saffarids, Samanids, Buyids), Kara-Khanids, Qara Khitai, Alwa, Jolof and Wolof kingdoms; plus 33 events, 21 people, 48 links. Map labels such as “minor Hindu and Buddhist states”, “Rajputana” and “Orissa” now open the Regional kingdoms of India entry, which exists for them.
- **Map gaps round 9 (28 full entries):** Mossi kingdoms, Dahomey, Great Lakes kingdoms (Buganda, Bunyoro, Rwanda, Burundi), Lozi, Ndebele, Shona kingdoms (Mutapa, Rozvi), Toucouleur Empire, Futa Jallon and Futa Toro, Samori’s Wassoulou Empire, Kong, Bambara kingdoms, Wadai, Bagirmi, Funj (Sennar), Zanzibar Sultanate, Boer republics, Akan states, Adal and Aussa, Kingdom of Hejaz, Rashidi Ha’il, England, Scotland, Kingdom of Ireland, Cambodia 1431–1863, Lao kingdoms, Shan states, Mrauk U (Arakan), Zand Persia; plus 43 events, 19 people, 54 links. Many dates for the African kingdoms are approximate (oral traditions). Check: Lan Na is linked to Toungoo Burma as a vassal (1558–1752); “Arabia” 1891–1902 now goes to Rashidi Ha’il; Zanzibar keeps its own entry under the British protectorate.
- **21 small countries (full entries, shown as dots):** Bahrain, Maldives, Mauritius, Seychelles, Comoros, Cabo Verde, São Tomé and Príncipe, Timor-Leste, South Sudan, Macau, Solomon Islands, Vanuatu, Palau, Micronesia, Marshall Islands, Nauru, Kiribati, Tuvalu, Monaco, San Marino, Vatican City; plus 32 events, 8 people, 28 links. Sensitive: Timor-Leste under Indonesian occupation, Bahrain 2011, South Sudan’s civil war, the Chagos claim (Mauritius), Mayotte (Comoros), Taiwan/China recognition switches in the Pacific.
- **Territories with their own government (round 8):** Hong Kong (since 1841), Puerto Rico (since 1898) and Greenland (since 1721) now have their own entries instead of showing as their ruling power; the ruler is named in each entry and in links. **Map fixes:** the source maps leave some land unnamed (Switzerland 1994–2010, Taiwan 1900/1994, Natal and Tasmania 1900, Euboea, Crete, East Thrace, central Arabia 1920–38); these are named in `scripts/border-fixes.json`, applied after every download. Check the 1920 East Thrace (Greek) and north-west Anatolia (Ottoman) choices.
- **Round 8 (7 entries and map links):** Germany 1918–45 (Weimar and Nazi Germany), East Germany, France 1792–1830 (Revolution, Napoleon, Restoration), Kingdom of Prussia, Old Swiss Confederacy, German states before unification, Italian states before unification; plus 14 events, 10 people, 16 links. About 90 colony and territory names linked by date (Italian Libya, South-West Africa under South Africa, Belgian Rwanda-Burundi, Spanish Guinea and Sahara, Gambia, Lesotho, Malta, Iceland under Denmark, Bosnia under Austria-Hungary, Montenegro in Serbia and Montenegro 1992–2006, Indian princely states before 1818, and others). Check: the Cape “Dutch settlements” label on the 1800 map is given to Great Britain (first British occupation 1795–1803); Naples, Sicily, Sardinia and Milan in 1600 are given to the Spanish Empire.
- **5 countries in Oceania (round 7, full entries):** New Zealand (since 1840), Papua New Guinea, Fiji, Samoa, Tonga (since 1845); plus 12 events, 9 people, 10 links; Pacific territories (American Samoa, Guam, Niue, Wallis and Futuna, New Caledonia, New Hebrides, Gilbert and Ellice) linked to their rulers by date. Approximations to check: the 1900 “Papua New Guinea” map area is given to Papuan peoples (Germany and Britain held the coasts); the 1700–1880 “Polynesians” areas are given to Austronesian peoples; the 1878–1900 “Arabia” area is given to the Saudi states (the Rashidi emirate of Ha’il ruled much of it after 1891).
- **10 countries in Asia (round 7, full entries):** Bangladesh, Sri Lanka, Nepal (since 1768), Bhutan (since 1616), Myanmar, Cambodia, Laos, Brunei, South Korea, North Korea; plus 26 events, 14 people, 22 links; Taiwan (Republic of China since 1949), Hong Kong, Korea 1945 and French Cochin China/Tonkin linked on the maps. Sensitive: Rohingya crisis, Sri Lankan civil war’s end, Khmer Rouge genocide, Bhutan’s Lhotshampa expulsion, North Korea data, Taiwan’s status.
- **17 countries in the Middle East and Central Asia (round 7, full entries):** Iraq, Syria, Lebanon, Jordan, Israel, Kuwait, Qatar, United Arab Emirates, Oman (since 1744), Yemen (since 1962), Armenia, Azerbaijan, Uzbekistan, Tajikistan, Kyrgyzstan, Turkmenistan, Pakistan; plus 31 events, 21 people, 31 links; mandate-era names (Mandatory Palestine, Mesopotamia, Transjordan, Aden) linked to the British Empire. Sensitive: Israel and Palestine (the Nakba, occupied territories, Jerusalem as capital), Golan Heights, Nagorno-Karabakh, Kirkuk, Kashmir, Syria after Assad, Yemen’s war. The 1920–38 “Emirate of Bin Shal’an” map area is linked to Saudi Arabia as an approximation.
- **24 countries in the Americas (round 7, full entries):** Ecuador, Uruguay, Guatemala, Honduras, Nicaragua, El Salvador, Costa Rica, Panama, Cuba, Haiti, Dominican Republic, Jamaica, Guyana, Suriname, Belize, The Bahamas, Barbados, Trinidad and Tobago, Grenada, Dominica, Saint Lucia, Saint Vincent and the Grenadines, Antigua and Barbuda, Saint Kitts and Nevis; plus 39 events, 29 people, 33 links, and Caribbean colony names linked to the British, French, Dutch, Spanish, Danish and Swedish empires. Sensitive: Guatemala’s civil war (genocide ruling), Essequibo and Belize claims, Haiti–Dominican relations (Parsley massacre), Cuba’s government, El Salvador under Bukele.
- **37 African countries (round 7, full entries):** Ghana, Senegal, Ivory Coast, Guinea, Mali (since 1960), Burkina Faso, Niger, Benin, Togo, Sierra Leone, Liberia, The Gambia, Guinea-Bissau, Mauritania, Cameroon, Central African Republic, Chad, Republic of the Congo, Gabon, Equatorial Guinea, Kenya, Uganda, Rwanda, Burundi, Ethiopia (since 1974), Somalia, Djibouti, Tunisia, Zambia, Zimbabwe, Malawi, Mozambique, Botswana, Namibia, Lesotho, Eswatini, Eritrea; plus 36 events, 15 people, 39 links. Sensitive: Rwanda genocide, Gukurahundi, Ethiopian Tigray war, Somaliland, Eritrea, Cameroon’s Anglophone crisis, Mauritania’s slavery legacy.
- **36 European countries (round 7, full 43-item entries):** United Kingdom, Netherlands, Portugal, Poland, Ukraine, Greece, Switzerland, Austria, Belgium, Ireland, Finland, Iceland, Hungary, Romania, Bulgaria, Czechoslovakia/Czechia, Yugoslavia, Serbia, Croatia, Slovenia, Bosnia and Herzegovina, Montenegro, North Macedonia, Albania, Slovakia, Estonia, Latvia, Lithuania, Belarus, Moldova, Georgia, Cyprus, Luxembourg, Liechtenstein, Andorra, Malta; plus 43 events, 14 people, 35 links. Sensitive: Kosovo, Transnistria, Abkhazia/South Ossetia, northern Cyprus, Crimea, Srebrenica, Belarus elections.
- **15 more entries (round 6, 7 Nov 2026):** Islamic Republic of Iran, Spain (since 1898), Norway (since 1905), Italy, Dutch colonial empire, Libya, Kazakhstan, Angola, Nigeria, Tanzania, Paraguay, Rouran Khaganate, Northern Yuan, Cumans and Kipchaks, Early peoples of southern India; plus 15 events, 11 people and 19 links. Sensitive: Iran, Libya, Nigeria’s civil war, Paraguay war losses.
- **132 new events, 141 new people and 67 new links** (7 Nov 2026), plus existing events and people tagged to newer civilisations, sourced to Wikipedia articles but not re-read. Check dates and who is linked to what.
- **16 more entries (round 5):** Papuan peoples, Taíno and Caribbean peoples, Ainu, medieval Poland and Lithuania, Hafsid Sultanate, Luba and Lunda kingdoms, Oromo peoples, Sultanate of Darfur, Ancestral Puebloans, Volga Bulgaria, Western Xia, Nanzhao and Dali, Pala Empire, Regional kingdoms of India, Yemeni states, Sultanates of the Malay world. These are shorter than older entries.
- **11 more entries (round 4):** Afghanistan, Morocco (Alaouite), Madagascar, Congo Free State/Belgian Congo/DR Congo, Hausa city-states, Venezuela, Bolivia, Chile, Kingdom of Denmark, Sweden (since 1721), South Africa. Sensitive: Western Sahara, the Congo Free State death toll, apartheid, Venezuela’s disputed elections.
- **8 more entries (round 3, mostly prehistory):** Archaic peoples of the Americas, Early farmers of Mesoamerica, Austronesian peoples, Early rice farmers of mainland Southeast Asia, Bronze Age steppe peoples, Neolithic and Bronze Age Europe, Peoples of pre-Islamic Arabia, Central African forest peoples.
- **Two new checklist items for all 190 entries** (380 answers): *Communication & transport* (Technology) and *Housing & daily life* (Culture), sourced to each entry’s Wikipedia article but not re-read.
- Sensitive: Tibet’s status, Russia’s annexations, the Falklands/Malvinas, and the treatment of Indigenous peoples in Canada, Australia, Brazil and the Plains.

## Priority 1 — major civilisations still to spot-check against a second source
Rome, Han, Ottoman, Mughal, Inca, Aztec, Mongol, Abbasid, Byzantium, Tang, Song, Ming, Qing, Maurya, Gupta, Achaemenid Persia, Sasanian Persia, Carthage, Assyria, Melaka.
For each: start/end dates, capital, founder, peak, and how it ended.

## Priority 2 — sensitive topics (check wording is neutral and fair)
- Israel and the Nakba (event israel-nakba)
- Taiwan’s status (Republic of China, PRC)
- Tibet and Xinjiang (PRC)
- Kashmir (India)
- The Armenian, Greek and Assyrian genocides (Ottoman Empire, Turkey, event armenian-genocide)
- The Holodomor (Soviet Union)
- Colonialism: “civilising mission” wording (French colonial empire), British, Dutch, Spanish, Portuguese entries
- The Atlantic slave trade (route atlantic-slave-trade)
- Native American displacement (United States)
- The Benin Bronzes (Kingdom of Benin)
- The Nanjing Massacre and Japanese wartime atrocities (Empire of Japan)
- Herero and Nama genocide (German Empire)

## Priority 3 — items marked *disputed* (317)
These record a genuine disagreement between sources. Check both views are stated fairly.
- **Abbasid Caliphate** · population: Not stated in Wikipedia.
- **Abbasid Caliphate** · wealth: No GDP estimate exists in the sources checked. Baghdad was among the richest cities in the world in the 9th century.
- **Aboriginal Australians** · population: Estimates for 1788 range widely, often about 300,000 to over 1 million.
- **Aboriginal Australians** · overallCertainty: Medium. Arrival date and population estimates are debated.
- **Aceh Sultanate** · population: No population figure is given in the sources checked.
- **Aceh Sultanate** · wealth: No GDP estimate exists.
- **Aceh Sultanate** · overallCertainty: Moderate. The founding date varies (1480, 1496 or c. 1514–1520) and the end date varies (1903, 1904, or 1912–14 counting resistance). Some figures come only fro
- **Achaemenid Persia** · wealth: No GDP estimate exists. Its treasuries held vast silver and gold, much of it later seized by Alexander.
- **Achaemenid Persia** · succession: Hereditary, but often violent: Darius I took power in 522 BCE after killing a ruler he said was the impostor Gaumata (accounts differ). Several kings were murde
- **Achaemenid Persia** · religion: Zoroastrianism was the religion of the kings (Wikipedia’s infobox calls it the state religion; the body marks this as needing a citation). Babylonian, Jewish, E
- **Achaemenid Persia** · declineSignals: Defeats in Greece, revolts by satraps and in Egypt, court murders and succession crises. Historians now question the old Greek picture of a “decadent” Persia.
- **Achaemenid Persia** · overallCertainty: Moderate. Much comes from Greek enemies. Darius’ succession, the role of Zoroastrianism and population figures are debated. The founding is dated 559 BCE (Cyrus
- **Akkadian Empire** · overallCertainty: Low to medium. Dates differ between chronologies (Sargon’s accession is placed at 2334, 2316 or 2285 BCE).
- **Kingdom of Aksum** · disasters: Soil erosion and environmental decline (around 650–700) are suggested factors in its decline.
- **Kingdom of Aksum** · population: Not known.
- **Kingdom of Aksum** · succession: Hereditary monarchy. The details are uncertain.
- **Kingdom of Aksum** · outcome: Decline and collapse around 960, in uncertain circumstances (traditionally linked to the disputed Queen Gudit). Succeeded by the Zagwe dynasty, and later the So
- **Kingdom of Aksum** · overallCertainty: Low to moderate. Dates of conversion (c. 324–340), coinage and the end are debated. Second source: Wikidata starts it c. 400 BCE (including the earlier Dʿmt per
- **Almohad Caliphate** · overallCertainty: Good; start is dated 1121 or 1130.
- **Ancient Egypt** · climate: Hot and arid, with almost all farming relying on the Nile’s yearly flood. A drought around 2200–2150 BCE is widely linked to the collapse of the Old Kingdom.
- **Ancient Egypt** · disasters: Low Nile floods meant famine. Drought is linked to the end of the Old Kingdom (c. 2181 BCE), though some historians stress other causes.
- **Ancient Egypt** · population: Not stated in the Wikipedia infobox. Modern estimates range from about 1–2 million in the Old Kingdom to 3–5 million in the New Kingdom and Ptolemaic periods.
- **Ancient Egypt** · wealth: No GDP estimate is possible. Egypt was the richest grain producer of the ancient Mediterranean.
- **Ancient Egypt** · socialStructure: Pharaoh, nobles and priests, scribes, craftsmen, farmers and labourers. Women had substantial legal rights. Whether slavery existed in the modern sense is debat
- **Ancient Egypt** · outcome: Conquest and transformation. The end of ancient Egypt is variously dated to 332 BCE (Alexander’s conquest) or 30 BCE (Roman annexation after Cleopatra VII).
- **Ancient Egypt** · overallCertainty: Good for monuments and rulers. Dates vary by chronology (e.g. the New Kingdom is given as 1570 or 1549 BCE to 1073 or 1069 BCE). Population is only estimated. S
- **Ancient Greece** · inequality: Free citizens, resident foreigners (metics), and large numbers of slaves. Between 40% and 80% of classical Athens’ population may have been enslaved, depending 
- **Ancient Greece** · overallCertainty: Good for major events. Period boundaries vary by source (e.g. the Dark Ages c. 1100–750 BCE; the Hellenistic end in 31 or 30 BCE). Population and slavery shares
- **Austria-Hungary** · wealth: No GDP figure is given in the sources checked.
- **Ayutthaya Kingdom** · wealth: No GDP estimate exists. The king held a near-monopoly on trade income.
- **Ayutthaya Kingdom** · overallCertainty: Moderate. The early chronology and Uthong’s origins are debated. Some famous episodes (Naresuan’s elephant duel) are questioned. Population is a rough estimate.
- **Aztec Empire** · wealth: No estimate is possible.
- **Aztec Empire** · overallCertainty: Moderate. Population and sacrifice numbers are debated. Some dates differ (the alliance in 1428 or 1430). Second source: Wikidata starts at the founding of Teno
- **Babylonia** · overallCertainty: Medium. Early dates differ by about 96 years between chronologies.
- **British Empire** · disasters: Severe famines occurred under British rule in India (e.g. 1876–78, Bengal 1943) and in Ireland (1845–52). Historians debate how much colonial policy contributed
- **British Empire** · colonisation: The largest colonial empire in history. Its rule brought railways and institutions but also conquest, violence, famine and economic exploitation, and its legacy
- **British Empire** · overallCertainty: High for dates, territory and population. Interpretations of the empire’s legacy, especially famines, violence and economic effects, are strongly debated. Secon
- **Bruneian Empire** · overallCertainty: Medium. Early dates are debated.
- **Byzantine Empire** · climate: Mediterranean. A cold period after volcanic eruptions in 536 CE coincided with plague and hardship in the 6th century.
- **Byzantine Empire** · overallCertainty: Good for political events. When to start the “Byzantine” period (330, 395, or the 7th century) is a convention. Population figures are estimates from different 
- **Caral–Supe (Norte Chico)** · moneyAndTax: No coinage. Dried anchovies may have served as a medium of exchange (suggested, not proven).
- **Caral–Supe (Norte Chico)** · scienceEducation: No writing. A knotted-cord record (khipu) may have existed, but this is debated.
- **Caral–Supe (Norte Chico)** · overallCertainty: Low to medium. Dates come from radiocarbon dating; the society’s organisation is largely inferred.
- **Carthage** · population: 3.7–4.3 million in the empire (222 BCE, infobox); the city itself had perhaps about 250,000.
- **Carthage** · overallCertainty: Medium. Mostly seen through Roman eyes; the founding date is unknown.
- **Chagatai Khanate** · overallCertainty: Medium. The infobox dates the whole khanate 1227–1347 and its eastern part to 1462; descendants ruled small states much later (to 1680 and beyond). This app use
- **Champa** · stability: Whether Champa was one kingdom or a federation of rival polities is debated.
- **Champa** · overallCertainty: Medium. Founding date and political unity are debated.
- **Chimú (Chimor)** · keyRulers: Taycanamo (legendary founder), Minchançaman (c. 1450–1470).
- **Chimú (Chimor)** · overallCertainty: Low to medium. Known from archaeology and Spanish accounts; ruler dates are uncertain.
- **Cucuteni–Trypillia culture** · overallCertainty: Medium; mega-site populations are debated. Second source: Wikidata gives c. 5400–2650 BCE; Wikipedia’s lead gives c. 5050–2950 BCE.
- **Đại Việt** · overallCertainty: Good overall; the founding date is given as 966 or 968. Second source: Wikidata uses 1054 (when the name Đại Việt was adopted); this app starts at independence 
- **Delhi Sultanate** · population: About 101 million (1500 estimate, very uncertain).
- **Dutch Republic** · overallCertainty: Good. The founding is dated 1579, 1581 or 1588 depending on the event chosen. Population is given as about 1.5 million or 1.88 million (1795).
- **Elam** · overallCertainty: Medium; the writing is only partly understood. Second source: Wikidata starts c. 2700 BCE; Wikipedia gives 3200 BCE.
- **Empire of Japan** · overallCertainty: High for events. Wartime atrocity death tolls and the nature of the 1930s–40s regime are debated.
- **Ethiopian Empire** · wealth: No GDP figure is given in the sources checked.
- **Ethiopian Empire** · overallCertainty: Moderate to good. Some dates differ (e.g. Gondar 1635/1636, federation with Eritrea 1950/1952). The cause of Haile Selassie’s death (1975) is disputed.
- **French Colonial Empire** · wealth: No GDP estimate is given in the sources checked.
- **French Colonial Empire** · colonisation: A major coloniser. The conquest of Algeria was very violent, with land dispossession and an estimated 500,000–1,000,000 Algerian deaths (summarised from the art
- …

## Priority 4 — civilisations with the most uncertain items
| Civilisation | Disputed | Estimated |
|---|---|---|
| Olmec | 13 | 17 |
| Indus Valley Civilisation | 12 | 18 |
| Minoan Civilisation | 12 | 11 |
| Great Zimbabwe | 11 | 6 |
| Teotihuacan | 8 | 18 |
| Gupta Empire | 7 | 12 |
| Ancient Egypt | 7 | 12 |
| Khmer Empire | 7 | 7 |
| Shang Dynasty | 6 | 20 |
| Srivijaya | 6 | 19 |
| Roman Empire | 6 | 9 |
| Qin Dynasty | 6 | 7 |
| Sumer | 5 | 23 |
| People’s Republic of China | 5 | 18 |
| Kingdom of Aksum | 5 | 16 |
| Majapahit | 5 | 14 |
| Maya (Classic period) | 5 | 13 |
| Achaemenid Persia | 5 | 11 |
| Maurya Empire | 4 | 17 |
| Mali Empire | 4 | 9 |
| Mongol Empire | 4 | 7 |
| Yuan Dynasty | 4 | 3 |
| Tiwanaku | 3 | 32 |
| Caral–Supe (Norte Chico) | 3 | 25 |
| Xiongnu | 3 | 23 |

## Known limitations (no fix needed, but worth knowing)
- Border maps (historical-basemaps) are approximate and years apart; territory charts inherit their gaps (e.g. the Mongol and British empires are understated).
- Population figures are scholarly estimates; many civilisations have none.
- Some links and events deliberately connect a territory’s history to a later state (e.g. events in British Malaya linked to Malaysia); they are listed with reasons in `scripts/consistency-allow.json`.

## How to correct something
1. Open the civilisation file, e.g. `src/data/polities/roman-empire.json`. Each item looks like:
   `{"value": "...", "year": 117, "certainty": "confirmed", "source": "Wikipedia: Roman Empire (checked 6 Nov 2026)"}`
2. Change the text, year, certainty and source. Keep the wording neutral and cite where the fact came from.
3. Run `npm run validate-data` and `npm test`, then open the app to see the change.

Or simply write notes (civilisation, item, what is wrong, your source) and pass them on.
