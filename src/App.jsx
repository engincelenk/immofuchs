import { useState, useCallback, useMemo, createContext, useContext, useRef, useEffect } from "react";
import { MARKET_RATES, GREST, BL_N, BL_O, KAPP15, MIET_P } from "./data.js";

// ═══ DATA (Marktdaten → src/data.js) ═══
const PLZ_RAW = "01067,Dresden,SN|01069,Dresden,SN|01097,Dresden,SN|01099,Dresden,SN|01108,Dresden,SN|01109,Dresden,SN|01127,Dresden,SN|01129,Dresden,SN|01139,Dresden,SN|01156,Dresden,SN|01157,Dresden,SN|01159,Dresden,SN|01169,Dresden,SN|01187,Dresden,SN|01189,Dresden,SN|01217,Dresden,SN|01219,Dresden,SN|01237,Dresden,SN|01239,Dresden,SN|01257,Dresden,SN|01259,Dresden,SN|01277,Dresden,SN|01279,Dresden,SN|01307,Dresden,SN|01309,Dresden,SN|01324,Dresden,SN|01326,Dresden,SN|01328,Dresden,SN|01445,Radebeul,SN|01454,Großerkmannsdorf,SN|01458,Ottendorf-Okrilla,SN|01462,Cossebaude,SN|01465,Langebrück,SN|01468,Kurort Volkersdorf,SN|01471,Bärnsdorf,SN|01477,Arnsdorf,SN|01558,Großenhain,SN|01561,Adelsdorf,SN|01587,Riesa,SN|01589,Oelsitz,SN|01591,Riesa,SN|01594,Böhlen,SN|01609,Gröditz,SN|01612,Colmnitz,SN|01616,Strehla,SN|01619,Gohlis,SN|01623,Abend,SN|01640,Coswig,SN|01662,Meißen,SN|01665,Diera,SN|01683,Bodenbach,SN|01689,Niederau,SN|01705,Freital,SN|01723,Grumbach,SN|01728,Bannewitz,SN|01731,Hornschänke,SN|01734,Rabenau,SN|01737,Braunsdorf,SN|01738,Colmnitz,SN|01744,Dippoldiswalde,SN|01762,Hartmannsdorf-Reichenau,SN|01768,Bärenstein,SN|01773,Altenberg,SN|01774,Höckendorf,SN|01776,Hermsdorf,SN|01778,Fürstenau,SN|01796,Dohma,SN|01809,Dohna,SN|01814,Bad Schandau,SN|01816,Bad Gottleuba,SN|01819,Bahretal,SN|01824,Gohrisch,SN|01825,Börnersdorf-Breitenau,SN|01829,Stadt Wehlen,SN|01833,Dürrröhrsdorf-Dittersbach,SN|01844,Hohwald,SN|01847,Lohmen,SN|01848,Hohnstein,SN|01855,Altendorf,SN|01877,Bischofswerda,SN|01896,Lichtenberg,SN|01900,Bretnig-Hauswalde,SN|01904,Neukirch,SN|01906,Burkau,SN|01909,Frankenthal,SN|01917,Kamenz,SN|01920,Bischheim-Häslich,SN|01936,Gottschdorf,SN|01945,Biehlen,BB|01968,Brieske,BB|01979,Grünewalde,BB|01983,Allmosen,BB|01987,Schwarzheide,BB|01990,Frauwalde,BB|01993,Schipkau,BB|01994,Annahütte,BB|01996,Hosena,BB|01998,Klettwitz,BB|02625,Bautzen,SN|02627,Hochkirch,SN|02633,Gaußig,SN|02681,Crostau,SN|02689,Sohland,SN|02692,Doberschau,SN|02694,Großdubrau,SN|02699,Königswartha,SN|02708,Dürrhennersdorf,SN|02727,Neugersdorf,SN|02730,Ebersbach,SN|02733,Cunewalde,SN|02736,Beiersdorf,SN|02739,Eibau,SN|02742,Friedersdorf,SN|02747,Berthelsdorf,SN|02748,Bernstadt,SN|02763,Bertsdorf-Hörnitz,SN|02779,Großschönau,SN|02782,Seifhennersdorf,SN|02785,Olbersdorf,SN|02788,Dittelsdorf,SN|02791,Oderwitz,SN|02794,Leutersdorf,SN|02796,Kurort Jonsdorf,SN|02797,Kurort Oybin,SN|02799,Waltersdorf,SN|02826,Görlitz,SN|02827,Görlitz,SN|02828,Görlitz,SN|02829,Königshain,SN|02894,Reichenbach,SN|02899,Ostritz,SN|02906,Hohendubrau,SN|02923,Hähnichen,SN|02929,Rothenburg,SN|02943,Boxberg,SN|02953,Bad Muskau,SN|02956,Rietschen,SN|02957,Krauschwitz,SN|02959,Groß Düben,SN|02977,Hoyerswerda,SN|02979,Burg,SN|02991,Laubusch,SN|02994,Bernsdorf,SN|02997,Wittichenau,SN|02999,Knappensee-Groß Särchen,SN|03042,Cottbus,BB|03044,Cottbus,BB|03046,Cottbus,BB|03048,Cottbus,BB|03050,Cottbus,BB|03051,Cottbus,BB|03052,Cottbus,BB|03053,Cottbus,BB|03054,Cottbus,BB|03055,Cottbus,BB|03058,Frauendorf,BB|03096,Brahmow,BB|03099,Kolkwitz,BB|03103,Lindchen,BB|03116,Domsdorf,BB|03119,Welzow,BB|03130,Bagenz,BB|03139,Schwarze Pumpe,BB|03149,Dubrau,BB|03159,Döbern,BB|03172,Atterwasch,BB|03185,Drachhausen,BB|03197,Drewitz,BB|03205,Bischdorf,BB|03222,Boblitz,BB|03226,Göritz,BB|03229,Altdöbern,BB|03238,Betten,BB|03246,Babben,BB|03249,Bahren,BB|03253,Arenzhain,BB|04103,Leipzig,SN|04105,Leipzig,SN|04107,Leipzig,SN|04109,Leipzig,SN|04129,Leipzig,SN|04155,Leipzig,SN|04157,Leipzig,SN|04158,Leipzig,SN|04159,Leipzig,SN|04177,Leipzig,SN|04178,Leipzig,SN|04179,Leipzig,SN|04205,Leipzig,SN|04207,Leipzig,SN|04209,Leipzig,SN|04229,Leipzig,SN|04249,Leipzig,SN|04275,Leipzig,SN|04277,Leipzig,SN|04279,Leipzig,SN|04288,Leipzig,SN|04289,Leipzig,SN|04299,Leipzig,SN|04315,Leipzig,SN|04316,Leipzig,SN|04317,Leipzig,SN|04318,Leipzig,SN|04319,Leipzig,SN|04328,Leipzig,SN|04329,Leipzig,SN|04347,Leipzig,SN|04349,Leipzig,SN|04356,Leipzig,SN|04357,Leipzig,SN|04416,Markkleeberg,SN|04420,Großlehna,SN|04425,Taucha,SN|04435,Schkeuditz,SN|04442,Zwenkau,SN|04451,Borsdorf,SN|04460,Kitzen,SN|04463,Großpösna,SN|04509,Brodau,SN|04519,Kletzen-Zschölkau,SN|04523,Elstertrebnitz,SN|04539,Groitzsch,SN|04552,Borna,SN|04564,Böhlen,SN|04565,Regis-Breitingen,SN|04567,Kitzscher,SN|04571,Rötha,SN|04574,Deutzen,SN|04575,Neukieritzsch,SN|04579,Espenhain,SN|04600,Altenburg,TH|04603,Göhren,TH|04610,Meuselwitz,TH|04613,Lucka,TH|04617,Fockendorf,TH|04618,Frohnsdorf,TH|04626,Altkirchen,TH|04639,Gößnitz,TH|04643,Altottenhain,SN|04651,Bad Lausick,SN|04654,Frohburg,SN|04655,Kohren-Sahlis,SN|04657,Langensteinbach,SN|04668,Böhlen,SN|04680,Bockwitz,SN|04683,Belgershain,SN|04685,Nerchau,SN|04687,Trebsen,SN|04688,Mutzschen,SN|04703,Bockelwitz,SN|04720,Beicha,SN|04736,Waldheim,SN|04741,Gertitzsch,SN|04746,Hartha,SN|04749,Ostrau,SN|04758,Cavertitz,SN|04769,Mügeln,SN|04774,Dahlen,SN|04779,Wermsdorf,SN|04808,Dornreichenbach,SN|04821,Brandis,SN|04824,Beucha,SN|04827,Gerichshain,SN|04828,Altenbach,SN|04838,Audenhain,SN|04849,Authausen,SN|04860,Großwig,SN|04874,Belgern,SN|04880,Dommitzsch,SN|04886,Arzberg,SN|04889,Langenreichenbach,SN|04895,Bahnsdorf,BB|04910,Elsterwerda,BB|04916,Ahlsdorf,BB|04924,Bad Liebenwerda,BB|04928,Döllingen,BB|04931,Altenau,BB|04932,Gröden,BB|04934,Hohenleipisch,BB|04936,Frankenhain,BB|04938,Drasdo,BB|06108,Halle,ST|06110,Halle,ST|06112,Halle,ST|06114,Halle,ST|06116,Halle,ST|06118,Halle,ST|06120,Halle,ST|06122,Halle,ST|06124,Halle,ST|06126,Halle,ST|06128,Halle,ST|06130,Halle,ST|06132,Halle,ST|06179,Angersdorf,ST|06184,Burgliebenau,ST|06188,Brachstedt,ST|06193,Gutenberg,ST|06198,Beesenstedt,ST|06217,Beuna,ST|06231,Bad Dürrenberg,ST|06237,Leuna,ST|06242,Braunsbedra,ST|06246,Bad Lauchstädt,ST|06249,Mücheln,ST|06254,Friedensdorf,ST|06255,Schafstädt,ST|06258,Korbetha,ST|06259,Frankleben,ST|06268,Albersroda,ST|06279,Alberstedt,ST|06295,Bischofrode,ST|06308,Annarode,ST|06311,Helbra,ST|06313,Ahlsdorf,ST|06317,Amsdorf,ST|06318,Wansleben am See,ST|06333,Arnstedt,ST|06343,Biesenrode,ST|06347,Freist,ST|06348,Großörner,ST|06366,Köthen,ST|06369,Arensdorf,ST|06385,Aken,ST|06386,Chörau,ST|06388,Baasdorf,ST|06406,Bernburg,ST|06408,Aderstedt,ST|06420,Domnitz,ST|06425,Alsleben,ST|06429,Gerbitz,ST|06449,Aschersleben,ST|06456,Drohndorf,ST|06458,Hausneindorf,ST|06463,Ermsleben,ST|06464,Frose,ST|06466,Gatersleben,ST|06467,Hoym,ST|06469,Nachterstedt,ST|06484,Ditfurt,ST|06493,Badeborn,ST|06502,Neinstedt,ST|06507,Allrode,ST|06526,Sangerhausen,ST|06528,Beyernaumburg,ST|06536,Bennungen,ST|06537,Kelbra,ST|06542,Allstedt,ST|06543,Abberode,ST|06547,Breitenstein,ST|06548,Rottleberode,ST|06556,Artern,TH|06567,Bad Frankenhausen,TH|06571,Bottendorf,TH|06577,Braunsroda,TH|06578,Bilzingsleben,TH|06618,Casekirchen,ST|06628,Abtlöbnitz,ST|06632,Balgstädt,ST|06636,Burgscheidungen,ST|06638,Karsdorf,ST|06642,Altenroda,ST|06647,Bad Bibra,ST|06648,Braunsroda,ST|06667,Burgwerben,ST|06679,Granschütz,ST|06682,Deuben,ST|06686,Dehlitz,ST|06688,Großkorbetha,ST|06712,Bergisdorf,ST|06721,Goldschau,ST|06722,Droyßig,ST|06724,Bröckau,ST|06725,Profen,ST|06727,Döbris,ST|06729,Etzoldshain,ST|06749,Bitterfeld,ST|06766,Bobbau,ST|06773,Bergwitz,ST|06774,Krina,ST|06779,Marke,ST|06780,Göttnitz,ST|06785,Brandhorst,ST|06786,Gohrau,ST|06791,Möhlau,ST|06792,Sandersdorf,ST|06794,Glebitzsch,ST|06796,Brehna,ST|06800,Altjeßnitz,ST|06803,Greppin,ST|06804,Burgkemnitz,ST|06808,Holzweißig,ST|06809,Petersroda,ST|06842,Dessau,ST|06844,Dessau,ST|06846,Dessau,ST|06847,Dessau,ST|06849,Dessau,ST|06862,Brambach,ST|06869,Buko,ST|06886,Lutherstadt Wittenberg,ST|06888,Abtsdorf,ST|06895,Boßdorf,ST|06896,Nudersdorf,ST|06901,Ateritz,ST|06905,Bad Schmiedeberg,ST|06909,Pretzsch,ST|06917,Arnsdorf,ST|06918,Elster,ST|06922,Axien,ST|06925,Annaburg,ST|06926,Buschkuhnsdorf,ST|06928,Dixförda,ST|07318,Arnsgereuth,TH|07330,Arnsbach,TH|07333,Unterwellenborn,TH|07334,Goßwitz,TH|07336,Birkigt,TH|07338,Altenbeuthen,TH|07343,Granitwerk Sormitztal,TH|07349,Lehesten,TH|07356,Altengesees,TH|07366,Birkenhügel,TH|07368,Ebersdorf,TH|07381,Bodelwitz,TH|07387,Gräfendorf,TH|07389,Bucha,TH|07407,Ammelstädt,TH|07422,Bad Blankenburg,TH|07426,Allendorf,TH|07427,Schwarzburg,TH|07429,Döschnitz,TH|07545,Gera,TH|07546,Gera,TH|07548,Gera,TH|07549,Gera,TH|07551,Gera,TH|07552,Gera,TH|07554,Bethenhausen,TH|07557,Crimla,TH|07570,Burkersdorf,TH|07580,Braunichswalde,TH|07586,Bad Köstritz,TH|07589,Bocka,TH|07607,Eisenberg,TH|07613,Crossen,TH|07616,Beulbar-Ilmsdorf,TH|07619,Mertendorf,TH|07629,Hermsdorf,TH|07639,Bad Klosterlausnitz,TH|07646,Albersdorf,TH|07743,Jena,TH|07745,Jena,TH|07747,Jena,TH|07749,Jena,TH|07751,Bucha,TH|07768,Altenberga,TH|07774,Camburg,TH|07778,Dornburg,TH|07806,Breitenhain,TH|07819,Burkersdorf,TH|07907,Burgk,TH|07919,Kirschkau,TH|07922,Tanna,TH|07924,Crispendorf,TH|07926,Gefell,TH|07927,Hirschberg,TH|07929,Saalburg,TH|07937,Förthen,TH|07950,Göhren-Döhlen,TH|07952,Arnsgrün,TH|07955,Auma,TH|07957,Hain,TH|07958,Hohenleuben,TH|07973,Greiz,TH|07980,Berga,TH|07985,Cossengrün,TH|07987,Mohlsdorf,TH|07989,Kleinreinsdorf,TH|08056,Zwickau,SN|08058,Zwickau,SN|08060,Zwickau,SN|08062,Zwickau,SN|08064,Zwickau,SN|08066,Zwickau,SN|08107,Hartmannsdorf,SN|08112,Wilkau-Haßlau,SN|08115,Lichtentanne,SN|08118,Hartenstein,SN|08121,Silberstraße,SN|08132,Mülsen,SN|08134,Langenweißbach,SN|08141,Reinsdorf,SN|08144,Ebersbrunn,SN|08147,Crinitzberg,SN|08209,Auerbach,SN|08223,Falkenstein,SN|08228,Rodewisch,SN|08233,Eich,SN|08236,Ellefeld,SN|08237,Steinberg,SN|08239,Bergen,SN|08248,Klingenthal,SN|08258,Bethanien,SN|08261,Schöneck,SN|08262,Morgenröthe-Rautenkranz,SN|08265,Erlbach,SN|08267,Zwota,SN|08269,Hammerbrücke,SN|08280,Aue,SN|08289,Schneeberg,SN|08294,Lößnitz,SN|08297,Zwönitz,SN|08301,Schlema,SN|08304,Schönheide,SN|08309,Blechhammer,SN|08312,Lauter,SN|08315,Bernsbach,SN|08318,Blauenthal,SN|08321,Zschorlau,SN|08324,Bockau,SN|08325,Carlsfeld,SN|08326,Sosa,SN|08328,Stützengrün,SN|08340,Beierfeld,SN|08349,Erlabrunn,SN|08352,Markersbach,SN|08355,Rittersgrün,SN|08358,Grünhain,SN|08359,Breitenbrunn,SN|08371,Glauchau,SN|08373,Remse,SN|08393,Dennheritz,SN|08396,Dürrenuhlsdorf,SN|08399,Wolkenburg-Kaufungen,SN|08412,Königswalde,SN|08427,Fraureuth,SN|08428,Langenbernsdorf,SN|08432,Steinpleis,SN|08439,Langenhessen,SN|08451,Crimmitschau,SN|08459,Neukirchen,SN|08468,Heinsdorfergrund,SN|08485,Lengenfeld,SN|08491,Brockau,SN|08496,Neumark,SN|08499,Mylau,SN|08523,Plauen,SN|08525,Kauschwitz,SN|08527,Neundorf,SN|08529,Plauen,SN|08538,Burgstein,SN|08539,Kornbach,SN|08541,Großfriesen,SN|08543,Helmsgrün,SN|08547,Jößnitz,SN|08548,Syrau,SN|08606,Bobenneukirchen,SN|08626,Adorf,SN|08645,Bad Elster,SN|08648,Bad Brambach,SN|09111,Chemnitz,SN|09112,Chemnitz,SN|09113,Chemnitz,SN|09114,Chemnitz,SN|09116,Chemnitz,SN|09117,Chemnitz,SN|09119,Chemnitz,SN|09120,Chemnitz,SN|09122,Chemnitz,SN|09123,Chemnitz,SN|09125,Chemnitz,SN|09126,Chemnitz,SN|09127,Chemnitz,SN|09128,Chemnitz,SN|09130,Chemnitz,SN|09131,Chemnitz,SN|09212,Bräunsdorf,SN|09217,Burgstädt,SN|09221,Neukirchen,SN|09224,Grüna,SN|09228,Wittgensdorf,SN|09232,Hartmannsdorf,SN|09235,Burkhardtsdorf,SN|09236,Claußnitz,SN|09241,Mühlau,SN|09243,Niederfrohna,SN|09244,Lichtenau,SN|09246,Pleißa,SN|09247,Kändler,SN|09249,Taura,SN|09306,Doberenz,SN|09322,Chursdorf,SN|09326,Aitzendorf,SN|09328,Lunzenau,SN|09337,Bernsdorf,SN|09350,Lichtenstein,SN|09353,Oberlungwitz,SN|09355,Gersdorf,SN|09356,St. Egidien,SN|09366,Niederdorf,SN|09376,Oelsnitz,SN|09380,Thalheim,SN|09385,Erlbach-Kirchberg,SN|09387,Jahnsdorf,SN|09390,Gornsdorf,SN|09392,Auerbach,SN|09394,Hohndorf,SN|09395,Hormersdorf,SN|09399,Niederwürschnitz,SN|09405,Gornau,SN|09419,Thum,SN|09423,Gelenau,SN|09427,Ehrenfriedersdorf,SN|09429,Falkenbach,SN|09430,Drebach,SN|09432,Großolbersdorf,SN|09434,Hohndorf,SN|09435,Grießbach,SN|09437,Börnichen,SN|09439,Amtsberg,SN|09456,Annaberg-Buchholz,SN|09465,Sehmatal-Cranzahl,SN|09468,Geyer,SN|09471,Bärenstein,SN|09474,Crottendorf,SN|09477,Grumbach,SN|09481,Elterlein,SN|09484,Kurort Oberwiesenthal,SN|09487,Schlettau,SN|09488,Neundorf,SN|09496,Kühnhaide,SN|09509,Pockau,SN|09514,Lengefeld,SN|09517,Zöblitz,SN|09518,Großrückerswalde,SN|09526,Heidersdorf,SN|09544,Neuhausen,SN|09548,Deutschneudorf,SN|09557,Flöha,SN|09569,Falkenau,SN|09573,Augustusburg,SN|09575,Eppendorf,SN|09577,Niederwiesa,SN|09579,Borstendorf,SN|09599,Freiberg,SN|09600,Niederschöna,SN|09603,Bräunsdorf,SN|09618,Brand-Erbisdorf,SN|09619,Dorfchemnitz,SN|09623,Frauenstein,SN|09627,Bobritzsch,SN|09629,Bieberstein,SN|09633,Halsbrücke,SN|09634,Friedland,SN|09636,Langenau,SN|09638,Lichtenberg,SN|09648,Altmittweida,SN|09661,Hainichen,SN|09669,Frankenberg,SN|10115,Berlin,BE|10117,Berlin,BE|10119,Berlin,BE|10178,Berlin,BE|10179,Berlin,BE|10243,Berlin,BE|10245,Berlin,BE|10247,Berlin,BE|10249,Berlin,BE|10315,Berlin,BE|10317,Berlin,BE|10318,Berlin,BE|10319,Berlin,BE|10365,Berlin,BE|10367,Berlin,BE|10369,Berlin,BE|10405,Berlin,BE|10407,Berlin,BE|10409,Berlin,BE|10435,Berlin,BE|10437,Berlin,BE|10439,Berlin,BE|10551,Berlin,BE|10553,Berlin,BE|10555,Berlin,BE|10557,Berlin,BE|10559,Berlin,BE|10585,Berlin,BE|10587,Berlin,BE|10589,Berlin,BE|10623,Berlin,BE|10625,Berlin,BE|10627,Berlin,BE|10629,Berlin,BE|10707,Berlin,BE|10709,Berlin,BE|10711,Berlin,BE|10713,Berlin,BE|10715,Berlin,BE|10717,Berlin,BE|10719,Berlin,BE|10777,Berlin,BE|10779,Berlin,BE|10781,Berlin,BE|10783,Berlin,BE|10785,Berlin,BE|10787,Berlin,BE|10789,Berlin,BE|10823,Berlin,BE|10825,Berlin,BE|10827,Berlin,BE|10829,Berlin,BE|10961,Berlin,BE|10963,Berlin,BE|10965,Berlin,BE|10967,Berlin,BE|10969,Berlin,BE|10997,Berlin,BE|10999,Berlin,BE|12043,Berlin,BE|12045,Berlin,BE|12047,Berlin,BE|12049,Berlin,BE|12051,Berlin,BE|12053,Berlin,BE|12055,Berlin,BE|12057,Berlin,BE|12059,Berlin,BE|12099,Berlin,BE|12101,Berlin,BE|12103,Berlin,BE|12105,Berlin,BE|12107,Berlin,BE|12109,Berlin,BE|12157,Berlin,BE|12159,Berlin,BE|12161,Berlin,BE|12163,Berlin,BE|12165,Berlin,BE|12167,Berlin,BE|12169,Berlin,BE|12203,Berlin,BE|12205,Berlin,BE|12207,Berlin,BE|12209,Berlin,BE|12247,Berlin,BE|12249,Berlin,BE|12277,Berlin,BE|12279,Berlin,BE|12305,Berlin,BE|12307,Berlin,BE|12309,Berlin,BE|12347,Berlin,BE|12349,Berlin,BE|12351,Berlin,BE|12353,Berlin,BE|12355,Berlin,BE|12357,Berlin,BE|12359,Berlin,BE|12435,Berlin,BE|12437,Berlin,BE|12439,Berlin,BE|12459,Berlin,BE|12487,Berlin,BE|12489,Berlin,BE|12524,Berlin,BE|12526,Berlin,BE|12527,Berlin,BE|12529,Schönefeld,BB|12555,Berlin,BE|12557,Berlin,BE|12559,Berlin,BE|12587,Berlin,BE|12589,Berlin,BE|12619,Berlin,BE|12621,Berlin,BE|12623,Berlin,BE|12625,Waldesruh,BB|12627,Berlin,BE|12629,Berlin,BE|12679,Berlin,BE|12681,Berlin,BE|12683,Berlin,BE|12685,Berlin,BE|12687,Berlin,BE|12689,Berlin,BE|13051,Berlin,BE|13053,Berlin,BE|13055,Berlin,BE|13057,Berlin,BE|13059,Berlin,BE|13086,Berlin,BE|13088,Berlin,BE|13089,Berlin,BE|13125,Berlin,BE|13127,Berlin,BE|13129,Berlin,BE|13156,Berlin,BE|13158,Berlin,BE|13159,Berlin,BE|13187,Berlin,BE|13189,Berlin,BE|13347,Berlin,BE|13349,Berlin,BE|13351,Berlin,BE|13353,Berlin,BE|13355,Berlin,BE|13357,Berlin,BE|13359,Berlin,BE|13403,Berlin,BE|13405,Berlin,BE|13407,Berlin,BE|13409,Berlin,BE|13435,Berlin,BE|13437,Berlin,BE|13439,Berlin,BE|13465,Berlin,BE|13467,Berlin,BE|13469,Berlin,BE|13503,Berlin,BE|13505,Berlin,BE|13507,Berlin,BE|13509,Berlin,BE|13581,Berlin,BE|13583,Berlin,BE|13585,Berlin,BE|13587,Berlin,BE|13589,Berlin,BE|13591,Berlin,BE|13593,Berlin,BE|13595,Berlin,BE|13597,Berlin,BE|13599,Berlin,BE|13627,Berlin,BE|13629,Berlin,BE|14050,Berlin,BE|14052,Berlin,BE|14053,Berlin,BE|14055,Berlin,BE|14057,Berlin,BE|14059,Berlin,BE|14089,Berlin,BE|14109,Berlin,BE|14129,Berlin,BE|14163,Berlin,BE|14165,Berlin,BE|14167,Berlin,BE|14169,Berlin,BE|14193,Berlin,BE|14195,Berlin,BE|14197,Berlin,BE|14199,Berlin,BE|14467,Potsdam,BB|14469,Potsdam,BB|14471,Potsdam,BB|14473,Potsdam,BB|14476,Fahrland,BB|14478,Potsdam,BB|14480,Potsdam,BB|14482,Potsdam,BB|14513,Teltow,BB|14532,Fahlhorst,BB|14542,Bliesendorf,BB|14547,Beelitz,BB|14548,Caputh,BB|14550,Bochow,BB|14552,Fresdorf,BB|14554,Seddiner See,BB|14557,Langerwisch,BB|14558,Bergholz-Rehbrücke,BB|14612,Falkensee,BB|14621,Schönwalde,BB|14624,Dallgow,BB|14627,Elstal,BB|14641,Berge,BB|14656,Alt Brieselang,BB|14662,Friesack,BB|14669,Gutenpaaren,BB|14712,Grünaue,BB|14715,Bahnitz,BB|14727,Döberitz,BB|14728,Dickte,BB|14770,Brandenburg,BB|14772,Brandenburg,BB|14774,Brandenburg,BB|14776,Brandenburg,BB|14778,Bagow,BB|14789,Bensdorf,BB|14793,Buckau,BB|14797,Damsdorf,BB|14798,Fohrde,BB|14806,Baitz,BB|14822,Alt Bork,BB|14823,Buchholz,BB|14827,Arensnest,BB|14828,Börnecke,BB|14913,Altes Lager,BB|14929,Frohnsdorf,BB|14943,Luckenwalde,BB|14947,Nuthe-Urstromtal,BB|14959,Blankensee,BB|14974,Ahrensdorf,BB|14979,Birkenhain,BB|15230,Frankfurt,BB|15232,Frankfurt,BB|15234,Frankfurt,BB|15236,Biegen,BB|15295,Brieskow-Finkenheerd,BB|15299,Dammendorf,BB|15306,Alt Mahlisch,BB|15320,Altbarnim,BB|15324,Gieshof-Zelliner Loose,BB|15326,Carzig,BB|15328,Alt Tucheband,BB|15344,Strausberg,BB|15345,Altlandsberg,BB|15366,Birkenstein,BB|15370,Bruchmühle,BB|15374,Eggersdorf Siedlung,BB|15377,Batzlow,BB|15378,Hennickendorf,BB|15517,Fürstenwalde,BB|15518,Alt Madlitz,BB|15526,Alt Golm,BB|15528,Hartmannsdorf,BB|15537,Burig,BB|15562,Rüdersdorf,BB|15566,Schöneiche,BB|15569,Woltersdorf,BB|15711,Königs Wusterhausen,BB|15732,Eichwalde,BB|15738,Zeuthen,BB|15741,Bestensee,BB|15745,Wildau,BB|15746,Groß Köris,BB|15748,Birkholz,BB|15749,Brusendorf,BB|15751,Miersdorfer Werder,BB|15752,Kolberg,BB|15754,Bindow,BB|15755,Egsdorf,BB|15757,Briesen,BB|15758,Kablow,BB|15806,Christinendorf,BB|15827,Blankenfelde,BB|15831,Birkholz,BB|15834,Pramsdorf,BB|15837,Baruth,BB|15838,Klausdorf,BB|15848,Beeskow,BB|15859,Alt Stahnsdorf,BB|15864,Ahrensdorf,BB|15868,Behlow,BB|15890,Bremsdorf,BB|15898,Bahro,BB|15907,Lübben,BB|15910,Alt-Schadow,BB|15913,Alt Zauche,BB|15926,Beesdau,BB|15936,Bollensdorf,BB|15938,Drahnsdorf,BB|16225,Eberswalde,BB|16227,Eberswalde,BB|16230,Blütenberg,BB|16244,Altenhof,BB|16247,Althüttendorf,BB|16248,Bölkendorf,BB|16259,Ackermannshof,BB|16269,Bliesdorf,BB|16278,Alt-Galow,BB|16303,Schwedt,BB|16306,Berkholz-Meyenburg,BB|16307,Gartz,BB|16321,Bernau,BB|16341,Schwanebeck,BB|16348,Groß Schönebeck,BB|16352,Basdorf,BB|16356,Ahrensfelde,BB|16359,Biesenthal,BB|16515,Bernöwe,BB|16540,Hohen Neuendorf,BB|16547,Birkenwerder,BB|16548,Glienicke,BB|16552,Schildow,BB|16556,Borgsdorf,BB|16559,Hammer,BB|16562,Bergfelde,BB|16565,Lehnitz,BB|16567,Mühlenbeck,BB|16727,Bärenklau,BB|16761,Hennigsdorf,BB|16766,Amalienfelde,BB|16767,Germendorf,BB|16775,Altlüdersdorf,BB|16792,Kurtschlag,BB|16798,Altthymen,BB|16816,Buskow,BB|16818,Albertinenhof,BB|16827,Alt Ruppin,BB|16831,Großzerlang,BB|16833,Betzin,BB|16835,Banzendorf,BB|16837,Alt Lutterow,BB|16845,Barsikow,BB|16866,Barenthin,BB|16868,Bantikow,BB|16909,Berlinchen,BB|16918,Freyenstein,BB|16928,Alt Krüssow,BB|16945,Buckow,BB|16949,Hülsebeck,BB|17033,Neubrandenburg,MV|17034,Neubrandenburg,MV|17036,Neubrandenburg,MV|17039,Beseritz,MV|17087,Altentreptow,MV|17089,Bartow,MV|17091,Altenhagen,MV|17094,Burg Stargard,MV|17098,Friedland,MV|17099,Brohm,MV|17109,Demmin,MV|17111,Beestland,MV|17121,Damerow,MV|17126,Jarmen,MV|17129,Alt Tellin,MV|17139,Basedow,MV|17153,Bredenfelde,MV|17154,Neukalen,MV|17159,Brudersdorf,MV|17166,Alt-Sührkow,MV|17168,Groß Wüstenfelde,MV|17179,Altkalen,MV|17192,Alt Schönau,MV|17194,Beckenkrug,MV|17207,Bollewick,MV|17209,Altenhof,MV|17213,Adamshoffnung,MV|17214,Alt Schwerin,MV|17217,Alt Rehse,MV|17219,Ankershagen,MV|17235,Neustrelitz,MV|17237,Babke,MV|17248,Lärz,MV|17252,Diemitz,MV|17255,Priepert,MV|17258,Beenz,BB|17259,Lichtenberg,MV|17268,Beutel,BB|17279,Lychen,BB|17291,Albrechtshof,BB|17309,Belling,MV|17321,Bergholz,MV|17322,Bismark,MV|17326,Bagemühl,BB|17328,Battinsthal,MV|17329,Krackow,MV|17335,Rohrkrug,MV|17337,Blumenhagen,MV|17348,Göhren,MV|17349,Groß Miltzow,MV|17358,Hammer,MV|17367,Eggesin,MV|17373,Ueckermünde,MV|17375,Ahlbeck,MV|17379,Altwigshagen,MV|17389,Anklam,MV|17390,Groß Polzin,MV|17391,Iven,MV|17392,Blesewitz,MV|17398,Bargischow,MV|17406,Morgenitz,MV|17419,Dargen,MV|17424,Seebad Heringsdorf,MV|17429,Benz,MV|17438,Wolgast,MV|17440,Buddenhagen,MV|17449,Karlshagen,MV|17454,Zinnowitz,MV|17459,Koserow,MV|17489,Greifswald,MV|17491,Greifswald,MV|17493,Greifswald,MV|17495,Groß Kiesow,MV|17498,Behrenhoff,MV|17506,Bandelin,MV|17509,Brünzow,MV|18055,Rostock,MV|18057,Rostock,MV|18059,Papendorf,MV|18069,Lambrechtshagen,MV|18106,Rostock,MV|18107,Elmenhorst/Lichtenhagen,MV|18109,Rostock,MV|18119,Rostock,MV|18146,Niederhagen,MV|18147,Rostock,MV|18181,Graal-Müritz,MV|18182,Bentwisch,MV|18184,Broderstorf,MV|18190,Groß Lüsewitz,MV|18195,Cammin,MV|18196,Damm,MV|18198,Kritzmow,MV|18209,Bad Doberan,MV|18211,Admannshagen-Bargeshagen,MV|18225,Kühlungsborn,MV|18230,Bastorf,MV|18233,Alt Bukow,MV|18236,Alt Karin,MV|18239,Anna Luisenhof,MV|18246,Baumgarten,MV|18249,Bernitt,MV|18258,Bandow,MV|18273,Güstrow,MV|18276,Bülow,MV|18279,Lalendorf,MV|18292,Bellin,MV|18299,Alt Kätwin,MV|18311,Ribnitz-Damgarten,MV|18314,Bartelshagen II,MV|18317,Hermannshagen Dorf,MV|18320,Ahrenshagen,MV|18334,Bad Sülze,MV|18337,Marlow,MV|18347,Dierhagen,MV|18356,Barth,MV|18374,Zingst,MV|18375,Born,MV|18435,Stralsund,MV|18437,Stralsund,MV|18439,Stralsund,MV|18442,Groß Kordshagen,MV|18445,Altenpleen,MV|18461,Franzburg,MV|18465,Drechow,MV|18469,Karnin,MV|18507,Grimmen,MV|18510,Behnkendorf,MV|18513,Deyelsdorf,MV|18516,Süderholz,MV|18519,Brandshagen,MV|18528,Bergen,MV|18546,Sassnitz,MV|18551,Glowe,MV|18556,Altenkirchen,MV|18565,Grieben,MV|18569,Gingst,MV|18573,Altefähr,MV|18574,Garz,MV|18581,Alt Lanschvitz,MV|18586,Baabe,MV|18609,Ostseebad Binz,MV|19053,Schwerin,MV|19055,Schwerin,MV|19057,Schwerin,MV|19059,Schwerin,MV|19061,Schwerin,MV|19063,Schwerin,MV|19065,Gneven,MV|19067,Cambs,MV|19069,Alt Meteln,MV|19071,Brüsewitz,MV|19073,Dümmer,MV|19075,Holthusen,MV|19077,Kraak,MV|19079,Banzkow,MV|19086,Plate,MV|19089,Bahlenhüschen,MV|19205,Bendhof,MV|19209,Badow,MV|19217,Benzin,MV|19230,Alt Zachun,MV|19243,Boddin,MV|19246,Bantin,MV|19249,Bandekow,MV|19258,Badekow,MV|19260,Albertinenhof,MV|19273,Bandekow,MV|19288,Alt Krenzlin,MV|19294,Altona,MV|19300,Balow,MV|19303,Alt Jabel,MV|19306,Blievenstorf,MV|19309,Baarz,BB|19322,Abbendorf,BB|19336,Bad Wilsnack,BB|19339,Bendelin,BB|19348,Baek,BB|19357,Birkholz,BB|19370,Parchim,MV|19372,Bauerkuhl,MV|19374,Bergrade Dorf,MV|19376,Drenkow,MV|19386,Broock,MV|19395,Barkow,MV|19399,Diestelow,MV|19406,Bolz,MV|19412,Alt Necheln,MV|19417,Bibow,MV|20095,Hamburg,HH|20097,Hamburg,HH|20099,Hamburg,HH|20144,Hamburg,HH|20146,Hamburg,HH|20148,Hamburg,HH|20149,Hamburg,HH|20249,Hamburg,HH|20251,Hamburg,HH|20253,Hamburg,HH|20255,Hamburg,HH|20257,Hamburg,HH|20259,Hamburg,HH|20354,Hamburg,HH|20355,Hamburg,HH|20357,Hamburg,HH|20359,Hamburg,HH|20457,Hamburg,HH|20459,Hamburg,HH|20535,Hamburg,HH|20537,Hamburg,HH|20539,Hamburg,HH|21029,Hamburg,HH|21031,Hamburg,HH|21033,Hamburg,HH|21035,Hamburg,HH|21037,Hamburg,HH|21039,Hamburg,HH|21073,Hamburg,HH|21075,Hamburg,HH|21077,Hamburg,HH|21079,Hamburg,HH|21107,Hamburg,HH|21109,Hamburg,HH|21129,Hamburg,HH|21147,Hamburg,HH|21149,Hamburg,HH|21217,Seevetal,NI|21218,Seevetal,NI|21220,Seevetal,NI|21224,Rosengarten,NI|21227,Am Jägerberg,NI|21228,Harmstorf,NI|21244,Buchholz,NI|21255,Dohren,NI|21256,Handeloh,NI|21258,Heidenau,NI|21259,Otter,NI|21261,Welle,NI|21266,Jesteburg,NI|21271,Asendorf,NI|21272,Egestorf,NI|21274,Undeloh,NI|21279,Appel,NI|21335,Lüneburg,NI|21337,Lüneburg,NI|21339,Lüneburg,NI|21354,Bleckede,NI|21357,Bardowick,NI|21358,Mechtersen,NI|21360,Vögelsen,NI|21365,Adendorf,NI|21368,Boitze,NI|21369,Nahrendorf,NI|21371,Tosterglope,NI|21376,Eyendorf,NI|21379,Echem,NI|21380,Artlenburg,NI|21382,Brietlingen,NI|21385,Amelinghausen,NI|21386,Betzendorf,NI|21388,Aspelhorn,NI|21391,Lüneburg,NI|21394,Kirchgellersen,NI|21395,Tespe,NI|21397,Barendorf,NI|21398,Neetze,NI|21400,Reinstorf,NI|21401,Thomasburg,NI|21403,Wendisch Evern,NI|21406,Barnstedt,NI|21407,Deutsch Evern,NI|21409,Embsen,NI|21423,Drage,NI|21435,Stelle,NI|21436,Marschacht,NI|21438,Brackel,NI|21439,Marxen,NI|21441,Garstedt,NI|21442,Toppenstedt,NI|21444,Einemhof,NI|21445,Wulfsen,NI|21447,Handorf,NI|21449,Radbruch,NI|21522,Hittbergen,NI|21614,Buxtehude,NI|21629,Neu Wulmstorf,NI|21635,Hinterdeich,NI|21640,Bliedersdorf,NI|21641,Apensen,NI|21643,Beckdorf,NI|21644,Sauensiek,NI|21646,Halvesbostel,NI|21647,Moisburg,NI|21649,Regesbostel,NI|21680,Stade,NI|21682,Stade,NI|21683,Stade,NI|21684,Agathenburg,NI|21698,Bargstedt,NI|21702,Ahlerstedt,NI|21706,Am Rönndeich,NI|21709,Burweg,NI|21710,Engelschoff,NI|21712,Großenwörden,NI|21714,Hammah,NI|21717,Deinste,NI|21720,Grünendeich,NI|21723,Hollern-Twielenfleth,NI|21726,Heinbockel,NI|21727,Estorf,NI|21729,Freiburg,NI|21730,Balje,NI|21732,Krummendeich,NI|21734,Breitendeich,NI|21737,Wischhafen,NI|21739,Dollern,NI|21745,Hemmoor,NI|21755,Hechthausen,NI|21756,Osten,NI|21762,Osterbruch,NI|21763,Neuenkirchen,NI|21765,Nordleda,NI|21769,Armstorf,NI|21770,Mittelstenahe,NI|21772,Stinstedt,NI|21775,Ihlienworth,NI|21776,Wanna,NI|21781,Cadenberge,NI|21782,Bülkau,NI|21784,Geversdorf,NI|21785,Belum,NI|21787,Oberndorf,NI|21789,Wingst,NI|22041,Hamburg,HH|22043,Hamburg,HH|22045,Hamburg,HH|22047,Hamburg,HH|22049,Hamburg,HH|22081,Hamburg,HH|22083,Hamburg,HH|22085,Hamburg,HH|22087,Hamburg,HH|22089,Hamburg,HH|22111,Hamburg,HH|22113,Hamburg,HH|22115,Hamburg,HH|22117,Hamburg,HH|22119,Hamburg,HH|22143,Hamburg,HH|22145,Hamburg,HH|22147,Hamburg,HH|22149,Hamburg,HH|22159,Hamburg,HH|22175,Hamburg,HH|22177,Hamburg,HH|22179,Hamburg,HH|22297,Hamburg,HH|22299,Hamburg,HH|22301,Hamburg,HH|22303,Hamburg,HH|22305,Hamburg,HH|22307,Hamburg,HH|22309,Hamburg,HH|22335,Hamburg,HH|22337,Hamburg,HH|22339,Hamburg,HH|22359,Hamburg,HH|22391,Hamburg,HH|22393,Hamburg,HH|22395,Hamburg,HH|22397,Hamburg,HH|22399,Hamburg,HH|22415,Hamburg,HH|22417,Hamburg,HH|22419,Hamburg,HH|22453,Hamburg,HH|22455,Hamburg,HH|22457,Hamburg,HH|22459,Hamburg,HH|22523,Hamburg,HH|22525,Hamburg,HH|22527,Hamburg,HH|22529,Hamburg,HH|22547,Hamburg,HH|22549,Hamburg,HH|22559,Hamburg,HH|22587,Hamburg,HH|22589,Hamburg,HH|22605,Hamburg,HH|22607,Hamburg,HH|22609,Hamburg,HH|22761,Hamburg,HH|22763,Hamburg,HH|22765,Hamburg,HH|22767,Hamburg,HH|22769,Hamburg,HH|23923,Bechelsdorf,MV|23936,Barendorf,MV|23942,Benckendorf,MV|23946,Ostseebad Boltenhagen,MV|23948,Arpshagen,MV|23966,Groß Krankow,MV|23968,Barnekow,MV|23970,Benz,MV|23972,Dorf Mecklenburg,MV|23974,Blowatz,MV|23992,Alt Poorstorf,MV|23996,Bad Kleinen,MV|23999,Insel Poel,MV|26121,Oldenburg,NI|26122,Oldenburg,NI|26123,Oldenburg,NI|26125,Oldenburg,NI|26127,Oldenburg,NI|26129,Oldenburg,NI|26131,Oldenburg,NI|26133,Oldenburg,NI|26135,Oldenburg,NI|26160,Bad Zwischenahn,NI|26169,Friesoythe,NI|26180,Rastede,NI|26188,Edewecht,NI|26197,Großenkneten,NI|26203,Wardenburg,NI|26209,Hatten,NI|26215,Wiefelstede,NI|26219,Bösel,NI|26316,Varel,NI|26340,Zetel,NI|26345,Bockhorn,NI|26349,Jade,NI|26382,Wilhelmshaven,NI|26384,Wilhelmshaven,NI|26386,Wilhelmshaven,NI|26388,Wilhelmshaven,NI|26389,Wilhelmshaven,NI|26409,Knyphauserwald,NI|26419,Schortens,NI|26427,Dunum,NI|26434,Wangerland,NI|26441,Groß Hauskreuz,NI|26446,Friedeburg,NI|26452,Sande,NI|26465,Langeoog,NI|26474,Spiekeroog,NI|26486,Wangerooge,NI|26487,Blomberg,NI|26489,Ochtersum,NI|26506,Norden,NI|26524,Berumbur,NI|26529,Leezdorf,NI|26532,Großheide,NI|26548,Norderney,NI|26553,Dornum,NI|26556,Eversmeer,NI|26571,Juist,NI|26579,Baltrum,NI|26603,Aurich,NI|26605,Aurich,NI|26607,Aurich,NI|26624,Südbrookmerland,NI|26629,Großefehn,NI|26632,Ihlow,NI|26639,Wiesmoor,NI|26655,Westerstede,NI|26670,Uplengen,NI|26676,Barßel,NI|26683,Saterland,NI|26689,Apen,NI|26721,Emden,NI|26723,Emden,NI|26725,Emden,NI|26736,Krummhörn,NI|26757,Borkum,NI|26759,Hinte,NI|26789,Leer,NI|26802,Grovehörn,NI|26810,Westoverledingen,NI|26817,Rhauderfehn,NI|26826,Weener,NI|26831,Boen,NI|26835,Brinkum,NI|26842,Ostrhauderfehn,NI|26844,Jemgum,NI|26845,Nortmoor,NI|26847,Detern,NI|26849,Filsum,NI|26871,Aschendorf,NI|26892,Dörpen,NI|26897,Bockhorst,NI|26899,Rhede,NI|26901,Lorup,NI|26903,Surwold,NI|26904,Börger,NI|26906,Dersum,NI|26907,Walchum,NI|26909,Neubörger,NI|26919,Brake,NI|26931,Elsfleth,NI|26935,Stadland,NI|26936,Stadland,NI|26937,Stadland,NI|26939,Ovelgönne,NI|26954,Nordenham,NI|26969,Butjadingen,NI|27211,Bassum,NI|27232,Sulingen,NI|27239,Twistringen,NI|27243,Beckeln,NI|27245,Bahrenborstel,NI|27246,Borstel,NI|27248,Ehrenburg,NI|27249,Maasen,NI|27251,Neuenkirchen,NI|27252,Schwaförden,NI|27254,Siedenburg,NI|27257,Affinghausen,NI|27259,Freistatt,NI|27283,Verden,NI|27299,Langwedel,NI|27305,Bruchhausen-Vilsen,NI|27308,Kirchlinteln,NI|27313,Dörverden,NI|27318,Hilgermissen,NI|27321,Emtinghausen,NI|27324,Eystrup,NI|27327,Martfeld,NI|27330,Asendorf,NI|27333,Bücken,NI|27336,Frankenfeld,NI|27337,Blender,NI|27339,Riede,NI|27356,Rotenburg,NI|27367,Ahausen,NI|27374,Visselhövede,NI|27383,Scheeßel,NI|27386,Bothel,NI|27389,Fintel,NI|27404,Elsdorf,NI|27412,Breddorf,NI|27419,Groß Meckelsen,NI|27432,Alfstedt,NI|27442,Gnarrenburg,NI|27446,Anderlingen,NI|27449,Kutenholz,NI|27472,Cuxhaven,NI|27474,Cuxhaven,NI|27476,Cuxhaven,NI|27478,Cuxhaven,NI|27499,Hamburg-Insel Neuwerk,HH|27568,Bremerhaven,HB|27570,Bremerhaven,HB|27572,Bremerhaven,HB|27574,Bremerhaven,HB|27576,Bremerhaven,HB|27578,Bremerhaven,HB|27580,Bremerhaven,HB|27607,Langen,NI|27612,Loxstedt,NI|27616,Appeln,NI|27619,Schiffdorf,NI|27624,Bad Bederkesa,NI|27628,Bramstedt,NI|27632,Cappel,NI|27637,Nordholz,NI|27638,Wremen,NI|27711,Osterholz-Scharmbeck,NI|27721,Ritterhude,NI|27726,Breddorfermoor,NI|27729,Axstedt,NI|27749,Delmenhorst,NI|27751,Delmenhorst,NI|27753,Delmenhorst,NI|27755,Delmenhorst,NI|27777,Ganderkesee,NI|27793,Wildeshausen,NI|27798,Hude,NI|27801,Dötlingen,NI|27804,Berne,NI|27809,Lemwerder,NI|28195,Bremen,HB|28197,Bremen,HB|28199,Bremen,HB|28201,Bremen,HB|28203,Bremen,HB|28205,Bremen,HB|28207,Bremen,HB|28209,Bremen,HB|28211,Bremen,HB|28213,Bremen,HB|28215,Bremen,HB|28217,Bremen,HB|28219,Bremen,HB|28237,Bremen,HB|28239,Bremen,HB|28259,Bremen,HB|28277,Bremen,HB|28279,Bremen,HB|28307,Bremen,HB|28309,Bremen,HB|28325,Bremen,HB|28327,Bremen,HB|28329,Bremen,HB|28355,Bremen,HB|28357,Bremen,HB|28359,Bremen,HB|28717,Bremen,HB|28719,Bremen,HB|28755,Bremen,HB|28757,Bremen,HB|28759,Bremen,HB|28777,Bremen,HB|28779,Bremen,HB|28790,Schwanewede,NI|28816,Stuhr,NI|28832,Achim,NI|28844,Weyhe,NI|28857,Syke,NI|28865,Lilienthal,NI|28870,Ottersberg,NI|28876,Oyten,NI|28879,Grasberg,NI|29221,Celle,NI|29223,Celle,NI|29225,Celle,NI|29227,Celle,NI|29229,Celle,NI|29303,Bergen,NI|29308,Winsen,NI|29313,Hambühren,NI|29320,Hermannsburg,NI|29323,Wietze,NI|29328,Faßberg,NI|29331,Lachendorf,NI|29336,Nienhagen,NI|29339,Wathlingen,NI|29342,Wienhausen,NI|29345,Unterlüß,NI|29348,Eschede,NI|29351,Eldingen,NI|29352,Adelheidsdorf,NI|29353,Ahnsbeck,NI|29355,Beedenbostel,NI|29356,Bröckel,NI|29358,Eicklingen,NI|29359,Habighorst,NI|29361,Höfer,NI|29362,Hohne,NI|29364,Langlingen,NI|29365,Sprakensehl,NI|29367,Steinhorst,NI|29369,Ummern,NI|29378,Wittingen,NI|29379,Wittingen,NI|29386,Dedelstorf,NI|29389,Bad Bodenteich,NI|29392,Wesendorf,NI|29393,Groß Oesingen,NI|29394,Lüder,NI|29396,Schönewörde,NI|29399,Wahrenholz,NI|29410,Klein Chüden,ST|29413,Bonese,ST|29416,Abbau Ader,ST|29439,Lüchow,NI|29451,Dannenberg,NI|29456,Hitzacker,NI|29459,Clenze,NI|29462,Wustrow,NI|29465,Schnega,NI|29468,Bergen,NI|29471,Gartow,NI|29472,Damnatz,NI|29473,Göhrde,NI|29475,Gorleben,NI|29476,Gusborn,NI|29478,Höhbeck,NI|29479,Jameln,NI|29481,Karwitz,NI|29482,Küsten,NI|29484,Langendorf,NI|29485,Lemgow,NI|29487,Luckau,NI|29488,Lübbow,NI|29490,Neu Darchau,NI|29491,Prezelle,NI|29493,Schnackenburg,NI|29494,Trebel,NI|29496,Waddeweitz,NI|29497,Woltersdorf,NI|29499,Zernien,NI|29525,Uelzen,NI|29549,Bad Bevensen,NI|29553,Bienenbüttel,NI|29556,Suderburg,NI|29559,Wrestedt,NI|29562,Suhlendorf,NI|29565,Wriedel,NI|29568,Wieren,NI|29571,Rosche,NI|29574,Ebstorf,NI|29575,Altenmedingen,NI|29576,Barum,NI|29578,Eimke,NI|29579,Emmendorf,NI|29581,Gerdau,NI|29582,Hanstedt,NI|29584,Himbergen,NI|29585,Jelmstorf,NI|29587,Natendorf,NI|29588,Oetzen,NI|29590,Rätzlingen,NI|29591,Römstedt,NI|29593,Schwienau,NI|29594,Soltendieck,NI|29596,Stadensen,NI|29597,Stoetze,NI|29599,Weste,NI|29614,Soltau,NI|29633,Munster,NI|29640,Heimbuch,NI|29643,Neuenkirchen,NI|29646,Bispingen,NI|29649,Wietzendorf,NI|29664,Ostenholz,NI|29683,Fallingbostel,NI|29690,Buchholz,NI|29693,Ahlden,NI|29699,Bomlitz,NI|30159,Hannover,NI|30161,Hannover,NI|30163,Hannover,NI|30165,Hannover,NI|30167,Hannover,NI|30169,Hannover,NI|30171,Hannover,NI|30173,Hannover,NI|30175,Hannover,NI|30177,Hannover,NI|30179,Hannover,NI|30419,Hannover,NI|30449,Hannover,NI|30451,Hannover,NI|30453,Hannover,NI|30455,Hannover,NI|30457,Hannover,NI|30459,Hannover,NI|30519,Hannover,NI|30521,Hannover,NI|30539,Hannover,NI|30559,Hannover,NI|30625,Hannover,NI|30627,Hannover,NI|30629,Hannover,NI|30655,Hannover,NI|30657,Hannover,NI|30659,Hannover,NI|30669,Hannover,NI|30823,Garbsen,NI|30826,Garbsen,NI|30827,Garbsen,NI|30851,Langenhagen,NI|30853,Langenhagen,NI|30855,Langenhagen,NI|30880,Laatzen,NI|30890,Barsinghausen,NI|30900,Wedemark,NI|30916,Isernhagen,NI|30926,Seelze,NI|30938,Burgwedel,NI|30952,Ronnenberg,NI|30966,Hemmingen,NI|30974,Wennigsen,NI|30982,Pattensen,NI|30989,Gehrden,NI|31008,Elze,NI|31020,Salzhemmendorf,NI|31028,Gronau,NI|31029,Banteln,NI|31032,Betheln,NI|31033,Brüggen,NI|31035,Despetal,NI|31036,Eime,NI|31039,Rheden,NI|31061,Alfeld,NI|31073,Delligsen,NI|31079,Adenstedt,NI|31084,Freden,NI|31085,Everode,NI|31087,Landwehr,NI|31088,Winzenburg,NI|31089,Duingen,NI|31091,Coppengrave,NI|31093,Hoyershausen,NI|31094,Marienhagen,NI|31096,Weenzen,NI|31097,Harbarnsen,NI|31099,Woltershausen,NI|31134,Hildesheim,NI|31135,Hildesheim,NI|31137,Hildesheim,NI|31139,Hildesheim,NI|31141,Hildesheim,NI|31157,Sarstedt,NI|31162,Bad Salzdetfurth,NI|31167,Bockenem,NI|31171,Nordstemmen,NI|31174,Schellerten,NI|31177,Harsum,NI|31180,Giesen,NI|31185,Söhlde,NI|31188,Holle,NI|31191,Algermissen,NI|31195,Lamspringe,NI|31196,Sehlem,NI|31199,Diekholzen,NI|31224,Peine,NI|31226,Peine,NI|31228,Peine,NI|31234,Edemissen,NI|31241,Ilsede,NI|31246,Lahstedt,NI|31249,Hohenhameln,NI|31275,Lehrte,NI|31303,Burgdorf,NI|31311,Uetze,NI|31319,Sehnde,NI|31515,Wunstorf,NI|31535,Neustadt,NI|31542,Bad Nenndorf,NI|31547,Rehburg-Loccum,NI|31552,Apelern,NI|31553,Auhagen,NI|31555,Suthfeld,NI|31556,Wölpinghausen,NI|31558,Hagenburg,NI|31559,Haste,NI|31582,Nienburg,NI|31592,Stolzenau,NI|31595,Steyerberg,NI|31600,Uchte,NI|31603,Diepenau,NI|31604,Raddestorf,NI|31606,Warmsen,NI|31608,Marklohe,NI|31609,Balge,NI|31613,Wietzen,NI|31618,Liebenau,NI|31619,Binnen,NI|31621,Pennigsehl,NI|31622,Heemsen,NI|31623,Drakenburg,NI|31626,Haßbergen,NI|31627,Rohrsen,NI|31628,Landesbergen,NI|31629,Estorf,NI|31632,Husum,NI|31633,Leese,NI|31634,Steimbke,NI|31636,Linsburg,NI|31637,Rodewald,NI|31638,Stöckse,NI|31655,Stadthagen,NI|31675,Bückeburg,NI|31683,Obernkirchen,NI|31688,Nienstädt,NI|31691,Helpsen,NI|31693,Hespe,NI|31698,Beckedorfer Schacht,NI|31699,Beckedorf,NI|31700,Heuerßen,NI|31702,Lüdersfeld,NI|31707,Bad Eilsen,NI|31708,Ahnsen,NI|31710,Buchholz,NI|31711,Luhden,NI|31712,Niedernwöhren,NI|31714,Lauenhagen,NI|31715,Meerbeck,NI|31717,Nordsehl,NI|31718,Pollhagen,NI|31719,Wiedensahl,NI|31737,Rinteln,NI|31749,Auetal,NI|31785,Hameln,NI|31787,Hameln,NI|31789,Hameln,NI|31812,Bad Pyrmont,NI|31832,Springe,NI|31840,Hessisch Oldendorf,NI|31848,Bad Münder,NI|31855,Aerzen,NI|31860,Emmerthal,NI|31863,Coppenbrügge,NI|31867,Hülsede,NI|31868,Ottenstein,NI|32049,Herford,NW|32051,Herford,NW|32052,Herford,NW|32105,Bad Salzuflen,NW|32107,Bad Salzuflen,NW|32108,Bad Salzuflen,NW|32120,Hiddenhausen,NW|32130,Enger,NW|32139,Spenge,NW|32257,Bünde,NW|32278,Kirchlengern,NW|32289,Rödinghausen,NW|32312,Lübbecke,NW|32339,Espelkamp,NW|32351,Stemwede,NW|32361,Preußisch Oldendorf,NW|32369,Rahden,NW|32423,Minden,NW|32425,Minden,NW|32427,Minden,NW|32429,Minden,NW|32457,Porta Westfalica,NW|32469,Petershagen,NW|32479,Hille,NW|32545,Bad Oeynhausen,NW|32547,Bad Oeynhausen,NW|32549,Bad Oeynhausen,NW|32584,Löhne,NW|32602,Vlotho,NW|32609,Hüllhorst,NW|32657,Lemgo,NW|32676,Lügde,NW|32683,Barntrup,NW|32689,Kalletal,NW|32694,Dörentrup,NW|32699,Extertal,NW|32756,Detmold,NW|32758,Detmold,NW|32760,Detmold,NW|32791,Lage,NW|32805,Horn-Bad Meinberg,NW|32816,Schieder-Schwalenberg,NW|32825,Blomberg,NW|32832,Augustdorf,NW|32839,Steinheim,NW|33014,Bad Driburg,NW|33034,Brakel,NW|33039,Nieheim,NW|33098,Paderborn,NW|33100,Paderborn,NW|33102,Paderborn,NW|33104,Paderborn,NW|33106,Paderborn,NW|33129,Delbrück,NW|33142,Büren,NW|33154,Paderborn,NW|33161,Hövelhof,NW|33165,Lichtenau,NW|33175,Bad Lippspringe,NW|33178,Borchen,NW|33181,Bad Wünnenberg,NW|33184,Altenbeken,NW|33189,Schlangen,NW|33330,Gütersloh,NW|33332,Gütersloh,NW|33334,Gütersloh,NW|33335,Gütersloh,NW|33378,Rheda-Wiedenbrück,NW|33397,Rietberg,NW|33415,Verl,NW|33428,Harsewinkel,NW|33442,Herzebrock-Clarholz,NW|33449,Langenberg,NW|33602,Bielefeld,NW|33604,Bielefeld,NW|33605,Bielefeld,NW|33607,Bielefeld,NW|33609,Bielefeld,NW|33611,Bielefeld,NW|33613,Bielefeld,NW|33615,Bielefeld,NW|33617,Bielefeld,NW|33619,Bielefeld,NW|33647,Bielefeld,NW|33649,Bielefeld,NW|33659,Bielefeld,NW|33689,Bielefeld,NW|33699,Bielefeld,NW|33719,Bielefeld,NW|33729,Bielefeld,NW|33739,Bielefeld,NW|33758,Schloß Holte-Stukenbrock,NW|33775,Versmold,NW|33790,Halle,NW|33803,Steinhagen,NW|33813,Oerlinghausen,NW|33818,Leopoldshöhe,NW|33824,Werther,NW|33829,Borgholzhausen,NW|34117,Kassel,HE|34119,Kassel,HE|34121,Kassel,HE|34123,Kassel,HE|34125,Kassel,HE|34127,Am Sandkopf,HE|34128,Kassel,HE|34130,Kassel,HE|34131,Kassel,HE|34132,Kassel,HE|34134,Kassel,HE|34212,Melsungen,HE|34225,Baunatal,HE|34233,Fuldatal,HE|34246,Hof Mondschirm,HE|34253,Lohfelden,HE|34260,Kaufungen,HE|34266,Niestetal,HE|34270,Schauenburg,HE|34277,Fuldabrück,HE|34281,Gudensberg,HE|34286,Spangenberg,HE|34289,Zierenberg,HE|34292,Ahnatal,HE|34295,Edermünde,HE|34298,Helsa,HE|34302,Guxhagen,HE|34305,Gestecke,HE|34308,Bad Emstal,HE|34311,Naumburg,HE|34314,Espenau,HE|34317,Habichtswald,HE|34320,Söhrewald,HE|34323,Malsfeld,HE|34326,Morschen,HE|34327,Körle,HE|34329,Nieste,HE|34346,Hann. Münden,NI|34355,Kassel,HE|34359,Reinhardshagen,HE|34369,Hofgeismar,HE|34376,Immenhausen,HE|34379,Calden,HE|34385,Bad Karlshafen,HE|34388,Trendelburg,HE|34393,Grebenstein,HE|34396,Liebenau,HE|34399,Oberweser,HE|34414,Warburg,NW|34431,Marsberg,NW|34434,Borgentreich,NW|34439,Willebadessen,NW|34454,Bad Arolsen,HE|34466,Wolfhagen,HE|34471,Volkmarsen,HE|34474,Diemelstadt,HE|34477,Twistetal,HE|34479,Breuna,HE|34497,Am Rainberge,HE|34508,Willingen,HE|34513,Klippmühle,HE|34516,Fürstental,HE|34519,Diemelsee,HE|34537,Bad Wildungen,HE|34549,Edertal,HE|34560,Fritzlar,HE|34576,Grünhof,HE|34582,Borken,HE|34587,Felsberg,HE|34590,Wabern,HE|34593,Knüllwald,HE|34596,Bad Zwesten,HE|34599,Neuental,HE|34613,Schwalmstadt,HE|34621,Frielendorf,HE|34626,Neukirchen,HE|34628,Willingshausen,HE|34630,Gilserberg,HE|34632,Jesberg,HE|34633,Ottrau,HE|34637,Schrecksbach,HE|34639,Schwarzenborn,HE|35037,Marburg,HE|35039,Marburg,HE|35041,Marburg,HE|35043,Capelle,HE|35066,Frankenberg,HE|35075,Gladenbach,HE|35080,Bad Endbach,HE|35083,Wetter,HE|35085,Ebsdorfergrund,HE|35088,Battenberg,HE|35091,Cölbe,HE|35094,Lahntal,HE|35096,Weimar,HE|35099,Burgwald,HE|35102,Lohra,HE|35104,Lichtenfels,HE|35108,Allendorf,HE|35110,Frankenau,HE|35112,Fronhausen,HE|35114,Haina,HE|35116,Hatzfeld,HE|35117,Münchhausen,HE|35119,Rosenthal,HE|35216,Biedenkopf,HE|35232,Dautphetal,HE|35236,Breidenbach,HE|35239,Steffenberg,HE|35260,Stadtallendorf,HE|35274,Kirchhain,HE|35279,Neustadt,HE|35282,Rauschenberg,HE|35285,Gemünden,HE|35287,Amöneburg,HE|35288,Wohratal,HE|35305,Grünberg,HE|35315,Homberg,HE|35321,Laubach,HE|35325,Mücke,HE|35327,Ulrichstein,HE|35329,Gemünden,HE|35390,Gießen,HE|35392,Gießen,HE|35394,Gießen,HE|35396,Gießen,HE|35398,Gießen,HE|35410,Hungen,HE|35415,Pohlheim,HE|35418,Buseck,HE|35423,Lich,HE|35428,Langgöns,HE|35435,Wettenberg,HE|35440,Linden,HE|35444,Biebertal,HE|35447,Reiskirchen,HE|35452,Heuchelheim,HE|35457,Lollar,HE|35460,Staufenberg,HE|35463,Fernwald,HE|35466,Rabenau,HE|35469,Allendorf,HE|35510,Butzbach,HE|35516,Münzenberg,HE|35519,Rockenberg,HE|35576,Wetzlar,HE|35578,Wetzlar,HE|35579,Wetzlar,HE|35580,Wetzlar,HE|35581,Wetzlar,HE|35582,Wetzlar,HE|35583,Wetzlar,HE|35584,Wetzlar,HE|35585,Wetzlar,HE|35586,Wetzlar,HE|35606,Solms,HE|35614,Aßlar,HE|35619,Braunfels,HE|35625,Hüttenberg,HE|35630,Ehringshausen,HE|35633,Lahnau,HE|35638,Leun,HE|35641,Schöffengrund,HE|35644,Hohenahr,HE|35647,Waldsolms,HE|35649,Bischoffen,HE|35683,Dillenburg,HE|35684,Dillenburg,HE|35685,Dillenburg,HE|35686,Dillenburg,HE|35687,Dillenburg,HE|35688,Dillenburg,HE|35689,Dillenburg,HE|35690,Dillenburg,HE|35708,Haiger,HE|35713,Eschenburg,HE|35716,Dietzhölztal,HE|35719,Angelburg,HE|35745,Herborn,HE|35753,Greifenstein,HE|35756,Mittenaar,HE|35759,Driedorf,HE|35764,Sinn,HE|35767,Breitscheid,HE|35768,Siegbach,HE|35781,Weilburg,HE|35789,Weilmünster,HE|35792,Löhnberg,HE|35794,Mengerskirchen,HE|35796,Weinbach,HE|35799,Merenberg,HE|36037,Fulda,HE|36039,Fulda,HE|36041,Fulda,HE|36043,Fulda,HE|36088,Hünfeld,HE|36093,Künzell,HE|36100,Petersberg,HE|36103,Flieden,HE|36110,Schlitz,HE|36115,Ehrenberg,HE|36119,Neuhof,HE|36124,Eichenzell,HE|36129,Gersfeld,HE|36132,Eiterfeld,HE|36137,Großenlüder,HE|36142,Tann,HE|36145,Hofbieber,HE|36148,Kalbach,HE|36151,Burghaun,HE|36154,Hosenfeld,HE|36157,Ebersburg,HE|36160,Dipperz,HE|36163,Poppenhausen,HE|36166,Haunetal,HE|36167,Nüsttal,HE|36169,Rasdorf,HE|36179,Bebra,HE|36199,Rotenburg,HE|36205,Sontra,HE|36208,Bellers,HE|36211,Alheim,HE|36214,Nentershausen,HE|36217,Ronshausen,HE|36219,Cornberg,HE|36251,Bad Hersfeld,HE|36266,Heringen,HE|36269,Philippsthal,HE|36272,Niederaula,HE|36275,Kirchheim,HE|36277,Schenklengsfeld,HE|36280,Oberaula,HE|36282,Hauneck,HE|36284,Hohenroda,HE|36286,Neuenstein,HE|36287,Breitenbach,HE|36289,Friedewald,HE|36304,Alsfeld,HE|36318,Schwalmtal,HE|36320,Kirtorf,HE|36323,Grebenau,HE|36325,Feldatal,HE|36326,Antrifttal,HE|36329,Romrod,HE|36341,Lauterbach,HE|36355,Grebenhain,HE|36358,Herbstein,HE|36364,Bad Salzschlirf,HE|36367,Wartenberg,HE|36369,Lautertal,HE|36381,Schlüchtern,HE|36391,Sinntal,HE|36396,Steinau,HE|36399,Freiensteinau,HE|36404,Gehaus,TH|36414,Pferdsdorf,TH|36419,Bermbach,TH|36433,Bad Salzungen,TH|36448,Bad Liebenstein,TH|36452,Andenhausen,TH|36456,Barchfeld,TH|36457,Stadtlengsfeld,TH|36460,Dietlas,TH|36466,Dermbach,TH|36469,Oberrohn,TH|37073,Göttingen,NI|37075,Göttingen,NI|37077,Göttingen,NI|37079,Göttingen,NI|37081,Göttingen,NI|37083,Göttingen,NI|37085,Göttingen,NI|37115,Duderstadt,NI|37120,Bovenden,NI|37124,Rosdorf,NI|37127,Brackenberg,NI|37130,Gleichen,NI|37133,Friedland,NI|37136,Ebergötzen,NI|37139,Adelebsen,NI|37154,Northeim,NI|37170,Uslar,NI|37176,Nörten-Hardenberg,NI|37181,Hardegsen,NI|37186,Moringen,NI|37191,Katlenburg-Lindau,NI|37194,Bodenfelde,NI|37197,Hattorf,NI|37199,Wulften,NI|37213,Witzenhausen,HE|37214,Witzenhausen,HE|37215,Witzenhausen,HE|37216,Witzenhausen,HE|37217,Nonnenholz,HE|37218,Witzenhausen,HE|37235,Hessisch Lichtenau,HE|37242,Bad Sooden-Allendorf,HE|37247,Großalmerode,HE|37249,Neu-Eichenberg,HE|37269,Eschwege,HE|37276,Meinhard,HE|37281,Wanfried,HE|37284,Waldkappel,HE|37287,Wehretal,HE|37290,Meißner,HE|37293,Herleshausen,HE|37296,Ringgau,HE|37297,Berkatal,HE|37299,Weißenborn,HE|37308,Ankermühle,TH|37318,Arenshausen,TH|37327,Beuren,TH|37339,Berlingerode,TH|37345,Bischofferode,TH|37351,Dingelstädt,TH|37355,Bernterode,TH|37359,Büttstedt,TH|37412,Aschenhütte,NI|37431,Bad Lauterberg,NI|37434,An der Rhumequelle,NI|37441,Bad Sachsa,NI|37444,St. Andreasberg,NI|37445,Walkenried,NI|37447,Wieda,NI|37449,Zorge,NI|37520,Osterode,NI|37534,Badenhausen,NI|37539,Bad Grund,NI|37547,Kreiensen,NI|37574,Einbeck,NI|37581,Bad Gandersheim,NI|37586,Dassel,NI|37589,Kalefeld,NI|37603,Holzminden,NI|37619,Bodenwerder,NI|37620,Bremke,NI|37627,Arholzen,NI|37632,Eimen,NI|37633,Dielmissen,NI|37635,Lüerdissen,NI|37639,Bevern,NI|37640,Golmbach,NI|37642,Holenberg,NI|37643,Negenborn,NI|37647,Brevörde,NI|37649,Heinsen,NI|37671,Höxter,NW|37688,Beverungen,NW|37691,Boffzen,NI|37696,Marienmünster,NW|37697,Lauenförde,NI|37699,Fürstenberg,NI|38100,Braunschweig,NI|38102,Braunschweig,NI|38104,Braunschweig,NI|38106,Braunschweig,NI|38108,Braunschweig,NI|38110,Braunschweig,NI|38112,Braunschweig,NI|38114,Braunschweig,NI|38116,Braunschweig,NI|38118,Braunschweig,NI|38120,Braunschweig,NI|38122,Braunschweig,NI|38124,Braunschweig,NI|38126,Braunschweig,NI|38154,Brunsleberfeld,NI|38159,Vechelde,NI|38162,Cremlingen,NI|38165,Lehre,NI|38170,Dahlum,NI|38173,Dettum,NI|38176,Wendeburg,NI|38179,Schwülper,NI|38226,Salzgitter,NI|38228,Salzgitter,NI|38229,Salzgitter,NI|38239,Salzgitter,NI|38259,Salzgitter,NI|38268,Lengede,NI|38271,Baddeckenstedt,NI|38272,Burgdorf,NI|38274,Elbe,NI|38275,Haverlah,NI|38277,Heere,NI|38279,Sehlde,NI|38300,Wolfenbüttel,NI|38302,Wolfenbüttel,NI|38304,Wolfenbüttel,NI|38312,Achim,NI|38315,Gielde,NI|38319,Remlingen,NI|38321,Denkte,NI|38322,Hedeper,NI|38324,Kissenbrück,NI|38325,Roklum,NI|38327,Semmenstedt,NI|38329,Wittmar,NI|38350,Am Tekenberge,NI|38364,Schöningen,NI|38368,Grasleben,NI|38372,Büddenstedt,NI|38373,Frellstedt,NI|38375,Räbke,NI|38376,Süpplingenburg,NI|38378,Warberg,NI|38379,Wolsdorf,NI|38381,Jerxheim,NI|38382,Beierstedt,NI|38384,Gevensleben,NI|38385,Ingeleben,NI|38387,Söllingen,NI|38388,Twieflingen,NI|38440,Wolfsburg,NI|38442,Wolfsburg,NI|38444,Wolfsburg,NI|38446,Wolfsburg,NI|38448,Wolfsburg,NI|38458,Velpke,NI|38459,Bahrdorf,NI|38461,Danndorf,NI|38462,Grafhorst,NI|38464,Groß Twülpstedt,NI|38465,Brome,NI|38467,Bergfeld,NI|38468,Ehra-Lessien,NI|38470,Parsau,NI|38471,Rühen,NI|38473,Tiddische,NI|38474,Tülau,NI|38476,Barwedel,NI|38477,Jembke,NI|38479,Tappenbeck,NI|38486,Apenburg,ST|38489,Ahlum,ST|38518,Gifhorn,NI|38524,Sassenburg,NI|38527,Meine,NI|38528,Adenbüttel,NI|38530,Didderse,NI|38531,Rötgesbüttel,NI|38533,Vordorf,NI|38536,Meinersen,NI|38539,Müden,NI|38542,Leiferde,NI|38543,Hillerse,NI|38547,Calberlah,NI|38550,Isenbüttel,NI|38551,Algesbüttel,NI|38553,Wasbüttel,NI|38554,Weyhausen,NI|38556,Bokensdorf,NI|38557,Osloß,NI|38559,Ringelah,NI|38640,Goslar,NI|38642,Goslar,NI|38644,Goslar,NI|38667,Bad Harzburg,NI|38678,Clausthal-Zellerfeld,NI|38685,Langelsheim,NI|38690,Vienenburg,NI|38700,Braunlage,NI|38704,Liebenburg,NI|38707,Altenau,NI|38709,Wildemann,NI|38723,Seesen,NI|38729,Hahausen,NI|38820,Halberstadt,ST|38822,Aspenstedt,ST|38828,Rodersdorf,ST|38829,Harsleben,ST|38835,Berßel,ST|38836,Anderbeck,ST|38838,Aderstedt,ST|38855,Danstedt,ST|38871,Abbenrode,ST|38875,Drei Annen Hohne,ST|38877,Benneckenstein,ST|38879,Schierke,ST|38889,Altenbrak,ST|38895,Derenburg,ST|38899,Hasselfelde,ST|39104,Magdeburg,ST|39106,Magdeburg,ST|39108,Magdeburg,ST|39110,Magdeburg,ST|39112,Magdeburg,ST|39114,Magdeburg,ST|39116,Magdeburg,ST|39118,Magdeburg,ST|39120,Magdeburg,ST|39122,Magdeburg,ST|39124,Magdeburg,ST|39126,Magdeburg,ST|39128,Magdeburg,ST|39130,Magdeburg,ST|39164,Bottmersdorf,ST|39167,Eichenbarleben,ST|39171,Altenweddingen,ST|39175,Biederitz,ST|39179,Barleben,ST|39218,Schönebeck,ST|39221,Biere,ST|39240,Breitenhagen,ST|39245,Dannigkow,ST|39249,Barby,ST|39261,Zerbst,ST|39264,Bias,ST|39279,Hobeck,ST|39288,Burg,ST|39291,Büden,ST|39307,Bergzow,ST|39317,Derben,ST|39319,Jerichow,ST|39326,Angern,ST|39340,Haldensleben,ST|39343,Ackendorf,ST|39345,Born,ST|39356,Behnsdorf,ST|39359,Böddensell,ST|39365,Drackenstedt,ST|39387,Altbrandsleben,ST|39393,Ausleben,ST|39397,Gröningen,ST|39398,Alikendorf,ST|39418,Neundorf,ST|39435,Borne,ST|39439,Amesdorf,ST|39443,Atzendorf,ST|39444,Hecklingen,ST|39446,Löderburg,ST|39448,Etgersleben,ST|39517,Bertingen,ST|39524,Fischbeck,ST|39539,Damerow,ST|39576,Stendal,ST|39579,Badingen,ST|39590,Bindfelde,ST|39596,Altenzaun,ST|39599,Deetz,ST|39606,Ballerstedt,ST|39615,Aulosen,ST|39619,Arendsee,ST|39624,Altmersleben,ST|39629,Bismark,ST|39638,Algenstedt,ST|39646,Kahnstieg,ST|39649,Dannefeld,ST|40210,Düsseldorf,NW|40211,Düsseldorf,NW|40212,Düsseldorf,NW|40213,Düsseldorf,NW|40215,Düsseldorf,NW|40217,Düsseldorf,NW|40219,Düsseldorf,NW|40221,Düsseldorf,NW|40223,Düsseldorf,NW|40225,Düsseldorf,NW|40227,Düsseldorf,NW|40229,Düsseldorf,NW|40231,Düsseldorf,NW|40233,Düsseldorf,NW|40235,Düsseldorf,NW|40237,Düsseldorf,NW|40239,Düsseldorf,NW|40468,Düsseldorf,NW|40470,Düsseldorf,NW|40472,Düsseldorf,NW|40474,Düsseldorf,NW|40476,Düsseldorf,NW|40477,Düsseldorf,NW|40479,Düsseldorf,NW|40489,Düsseldorf,NW|40545,Düsseldorf,NW|40547,Düsseldorf,NW|40549,Düsseldorf,NW|40589,Düsseldorf,NW|40591,Düsseldorf,NW|40593,Düsseldorf,NW|40595,Düsseldorf,NW|40597,Düsseldorf,NW|40599,Düsseldorf,NW|40625,Düsseldorf,NW|40627,Düsseldorf,NW|40629,Düsseldorf,NW|40667,Meerbusch,NW|40668,Meerbusch,NW|40670,Meerbusch,NW|40699,Erkrath,NW|40721,Düsseldorf,NW|40723,Hilden,NW|40724,Hilden,NW|40764,Langenfeld,NW|40789,Monheim,NW|40822,Mettmann,NW|40878,Ratingen,NW|40880,Ratingen,NW|40882,Ratingen,NW|40883,Ratingen,NW|40885,Ratingen,NW|41061,Mönchengladbach,NW|41063,Mönchengladbach,NW|41065,Mönchengladbach,NW|41066,Mönchengladbach,NW|41068,Mönchengladbach,NW|41069,Mönchengladbach,NW|41169,Mönchengladbach,NW|41179,Mönchengladbach,NW|41189,Mönchengladbach,NW|41199,Mönchengladbach,NW|41236,Mönchengladbach,NW|41238,Mönchengladbach,NW|41239,Mönchengladbach,NW|41334,Nettetal,NW|41352,Korschenbroich,NW|41363,Jüchen,NW|41366,Schwalmtal,NW|41372,Niederkrüchten,NW|41379,Brüggen,NW|41460,Neuss,NW|41462,Neuss,NW|41464,Neuss,NW|41466,Neuss,NW|41468,Neuss,NW|41469,Neuss,NW|41470,Neuss,NW|41472,Neuss,NW|41515,Grevenbroich,NW|41516,Grevenbroich,NW|41517,Grevenbroich,NW|41539,Dormagen,NW|41540,Dormagen,NW|41541,Dormagen,NW|41542,Dormagen,NW|41564,Kaarst,NW|41569,Rommerskirchen,NW|41747,Viersen,NW|41748,Viersen,NW|41749,Viersen,NW|41751,Viersen,NW|41812,Erkelenz,NW|41836,Hückelhoven,NW|41844,Wegberg,NW|41849,Wassenberg,NW|42103,Wuppertal,NW|42105,Wuppertal,NW|42107,Wuppertal,NW|42109,Wuppertal,NW|42111,Wuppertal,NW|42113,Wuppertal,NW|42115,Wuppertal,NW|42117,Wuppertal,NW|42119,Wuppertal,NW|42275,Wuppertal,NW|42277,Wuppertal,NW|42279,Wuppertal,NW|42281,Wuppertal,NW|42283,Wuppertal,NW|42285,Wuppertal,NW|42287,Wuppertal,NW|42289,Wuppertal,NW|42327,Wuppertal,NW|42329,Wuppertal,NW|42349,Wuppertal,NW|42369,Wuppertal,NW|42389,Wuppertal,NW|42399,Wuppertal,NW|42477,Radevormwald,NW|42489,Wülfrath,NW|42499,Hückeswagen,NW|42549,Velbert,NW|42551,Velbert,NW|42553,Velbert,NW|42555,Velbert,NW|42579,Heiligenhaus,NW|42651,Solingen,NW|42653,Solingen,NW|42655,Solingen,NW|42657,Solingen,NW|42659,Solingen,NW|42697,Solingen,NW|42699,Solingen,NW|42719,Solingen,NW|42781,Haan,NW|42799,Leichlingen,NW|42853,Remscheid,NW|42855,Remscheid,NW|42857,Remscheid,NW|42859,Remscheid,NW|42897,Remscheid,NW|42899,Remscheid,NW|42929,Wermelskirchen,NW|44135,Dortmund,NW|44137,Dortmund,NW|44139,Dortmund,NW|44141,Dortmund,NW|44143,Dortmund,NW|44145,Dortmund,NW|44147,Dortmund,NW|44149,Dortmund,NW|44225,Dortmund,NW|44227,Dortmund,NW|44229,Dortmund,NW|44263,Dortmund,NW|44265,Dortmund,NW|44267,Dortmund,NW|44269,Dortmund,NW|44287,Dortmund,NW|44289,Dortmund,NW|44309,Dortmund,NW|44319,Dortmund,NW|44328,Dortmund,NW|44329,Dortmund,NW|44339,Dortmund,NW|44357,Dortmund,NW|44359,Dortmund,NW|44369,Dortmund,NW|44379,Dortmund,NW|44388,Dortmund,NW|44532,Lünen,NW|44534,Lünen,NW|44536,Lünen,NW|44575,Castrop-Rauxel,NW|44577,Castrop-Rauxel,NW|44579,Castrop-Rauxel,NW|44581,Castrop-Rauxel,NW|44623,Herne,NW|44625,Herne,NW|44627,Herne,NW|44628,Herne,NW|44629,Herne,NW|44649,Herne,NW|44651,Herne,NW|44652,Herne,NW|44653,Herne,NW|44787,Bochum,NW|44789,Bochum,NW|44791,Bochum,NW|44793,Bochum,NW|44795,Bochum,NW|44797,Bochum,NW|44799,Bochum,NW|44801,Bochum,NW|44803,Bochum,NW|44805,Bochum,NW|44807,Bochum,NW|44809,Bochum,NW|44866,Bochum,NW|44867,Bochum,NW|44869,Bochum,NW|44879,Bochum,NW|44892,Bochum,NW|44894,Bochum,NW|45127,Essen,NW|45128,Essen,NW|45130,Essen,NW|45131,Essen,NW|45133,Essen,NW|45134,Essen,NW|45136,Essen,NW|45138,Essen,NW|45139,Essen,NW|45141,Essen,NW|45143,Essen,NW|45144,Essen,NW|45145,Essen,NW|45147,Essen,NW|45149,Essen,NW|45219,Essen,NW|45239,Essen,NW|45257,Essen,NW|45259,Essen,NW|45276,Essen,NW|45277,Essen,NW|45279,Essen,NW|45289,Essen,NW|45307,Essen,NW|45309,Essen,NW|45326,Essen,NW|45327,Essen,NW|45329,Essen,NW|45355,Essen,NW|45356,Essen,NW|45357,Essen,NW|45359,Essen,NW|45468,Mülheim,NW|45470,Mülheim,NW|45472,Mülheim,NW|45473,Mülheim,NW|45475,Mülheim,NW|45476,Mülheim,NW|45478,Mülheim,NW|45479,Mülheim,NW|45481,Mülheim,NW|45525,Hattingen,NW|45527,Hattingen,NW|45529,Hattingen,NW|45549,Sprockhövel,NW|45657,Recklinghausen,NW|45659,Recklinghausen,NW|45661,Recklinghausen,NW|45663,Recklinghausen,NW|45665,Recklinghausen,NW|45699,Herten,NW|45701,Herten,NW|45711,Datteln,NW|45721,Haltern am See,NW|45731,Waltrop,NW|45739,Oer-Erkenschwick,NW|45768,Marl,NW|45770,Marl,NW|45772,Marl,NW|45879,Gelsenkirchen,NW|45881,Gelsenkirchen,NW|45883,Gelsenkirchen,NW|45884,Gelsenkirchen,NW|45886,Gelsenkirchen,NW|45888,Gelsenkirchen,NW|45889,Gelsenkirchen,NW|45891,Gelsenkirchen,NW|45892,Gelsenkirchen,NW|45894,Gelsenkirchen,NW|45896,Gelsenkirchen,NW|45897,Gelsenkirchen,NW|45899,Gelsenkirchen,NW|45964,Gladbeck,NW|45966,Gladbeck,NW|45968,Gladbeck,NW|46045,Oberhausen,NW|46047,Oberhausen,NW|46049,Oberhausen,NW|46117,Oberhausen,NW|46119,Oberhausen,NW|46145,Oberhausen,NW|46147,Oberhausen,NW|46149,Oberhausen,NW|46236,Bottrop,NW|46238,Bottrop,NW|46240,Bottrop,NW|46242,Bottrop,NW|46244,Bottrop,NW|46282,Dorsten,NW|46284,Dorsten,NW|46286,Dorsten,NW|46325,Borken,NW|46342,Velen,NW|46348,Raesfeld,NW|46354,Südlohn,NW|46359,Heiden,NW|46395,Bocholt,NW|46397,Bocholt,NW|46399,Bocholt,NW|46414,Rhede,NW|46419,Isselburg,NW|46446,Emmerich,NW|46459,Rees,NW|46483,Wesel,NW|46485,Wesel,NW|46487,Wesel,NW|46499,Hamminkeln,NW|46509,Xanten,NW|46514,Schermbeck,NW|46519,Alpen,NW|46535,Dinslaken,NW|46537,Dinslaken,NW|46539,Dinslaken,NW|46562,Voerde,NW|46569,Hünxe,NW|47051,Duisburg,NW|47053,Duisburg,NW|47055,Duisburg,NW|47057,Duisburg,NW|47058,Duisburg,NW|47059,Duisburg,NW|47119,Duisburg,NW|47137,Duisburg,NW|47138,Duisburg,NW|47139,Duisburg,NW|47166,Duisburg,NW|47167,Duisburg,NW|47169,Duisburg,NW|47178,Duisburg,NW|47179,Duisburg,NW|47198,Duisburg,NW|47199,Duisburg,NW|47226,Duisburg,NW|47228,Duisburg,NW|47229,Duisburg,NW|47239,Duisburg,NW|47249,Duisburg,NW|47259,Duisburg,NW|47269,Duisburg,NW|47279,Duisburg,NW|47441,Moers,NW|47443,Moers,NW|47445,Moers,NW|47447,Moers,NW|47475,Kamp-Lintfort,NW|47495,Rheinberg,NW|47506,Neukirchen-Vluyn,NW|47509,Rheurdt,NW|47533,Kleve,NW|47546,Kalkar,NW|47551,Bedburg-Hau,NW|47559,Kranenburg,NW|47574,Goch,NW|47589,Uedem,NW|47608,Geldern,NW|47623,Kevelaer,NW|47624,Kevelaer,NW|47625,Kevelaer,NW|47626,Kevelaer,NW|47627,Kevelaer,NW|47638,Straelen,NW|47647,Kerken,NW|47652,Weeze,NW|47661,Issum,NW|47665,Sonsbeck,NW|47669,Wachtendonk,NW|47798,Krefeld,NW|47799,Krefeld,NW|47800,Krefeld,NW|47802,Krefeld,NW|47803,Krefeld,NW|47804,Krefeld,NW|47805,Krefeld,NW|47807,Krefeld,NW|47809,Krefeld,NW|47829,Krefeld,NW|47839,Krefeld,NW|47877,Willich,NW|47906,Kempen,NW|47918,Tönisvorst,NW|47929,Grefrath,NW|48143,Münster,NW|48145,Münster,NW|48147,Münster,NW|48149,Münster,NW|48151,Münster,NW|48153,Münster,NW|48155,Münster,NW|48157,Münster,NW|48159,Münster,NW|48161,Münster,NW|48163,Münster,NW|48165,Münster,NW|48167,Münster,NW|48231,Warendorf,NW|48249,Dülmen,NW|48268,Greven,NW|48282,Emsdetten,NW|48291,Telgte,NW|48301,Nottuln,NW|48308,Senden,NW|48317,Drensteinfurt,NW|48324,Sendenhorst,NW|48329,Havixbeck,NW|48336,Sassenberg,NW|48341,Altenberge,NW|48346,Ostbevern,NW|48351,Everswinkel,NW|48356,Nordwalde,NW|48361,Beelen,NW|48366,Laer,NW|48369,Saerbeck,NW|48429,Rheine,NW|48431,Rheine,NW|48432,Rheine,NW|48455,Bad Bentheim,NI|48465,Engden,NI|48477,Hörstel,NW|48480,Lünne,NI|48485,Neuenkirchen,NW|48488,Emsbüren,NI|48493,Wettringen,NW|48496,Hopsten,NW|48499,Salzbergen,NI|48527,Nordhorn,NI|48529,Nordhorn,NI|48531,Nordhorn,NI|48565,Steinfurt,NW|48599,Gronau,NW|48607,Ochtrup,NW|48612,Horstmar,NW|48619,Heek,NW|48624,Schöppingen,NW|48629,Metelen,NW|48653,Coesfeld,NW|48683,Ahaus,NW|48691,Vreden,NW|48703,Stadtlohn,NW|48712,Gescher,NW|48720,Rosendahl,NW|48727,Billerbeck,NW|48734,Reken,NW|48739,Legden,NW|49074,Osnabrück,NI|49076,Osnabrück,NI|49078,Osnabrück,NI|49080,Osnabrück,NI|49082,Osnabrück,NI|49084,Osnabrück,NI|49086,Osnabrück,NI|49088,Osnabrück,NI|49090,Osnabrück,NI|49124,Georgsmarienhütte,NI|49134,Wallenhorst,NI|49143,Bissendorf,NI|49152,Bad Essen,NI|49163,Bohmte,NI|49170,Hagen,NI|49176,Hilter,NI|49179,Ostercappeln,NI|49186,Bad Iburg,NI|49191,Belm,NI|49196,Bad Laer,NI|49201,Dissen,NI|49205,Hasbergen,NI|49214,Bad Rothenfelde,NI|49219,Glandorf,NI|49324,Melle,NI|49326,Melle,NI|49328,Melle,NI|49356,Diepholz,NI|49377,Vechta,NI|49393,Lohne,NI|49401,Damme,NI|49406,Barnstorf,NI|49413,Dinklage,NI|49419,Wagenfeld,NI|49424,Goldenstedt,NI|49429,Visbek,NI|49434,Neuenkirchen-Vörden,NI|49439,Steinfeld,NI|49448,Brockum,NI|49451,Holdorf,NI|49453,Barver,NI|49456,Bakum,NI|49457,Drebber,NI|49459,Berglage,NI|49477,Ibbenbüren,NW|49479,Ibbenbüren,NW|49492,Westerkappeln,NW|49497,Mettingen,NW|49504,Lotte,NW|49509,Recke,NW|49525,Lengerich,NW|49536,Lienen,NW|49545,Tecklenburg,NW|49549,Ladbergen,NW|49565,Bramsche,NI|49577,Ankum,NI|49584,Fürstenau,NI|49586,Merzen,NI|49593,Bersenbrück,NI|49594,Alfhausen,NI|49596,Gehrde,NI|49597,Rieste,NI|49599,Voltlage,NI|49610,Quakenbrück,NI|49624,Löningen,NI|49626,Berge,NI|49632,Essen,NI|49635,Badbergen,NI|49637,Menslage,NI|49638,Nortrup,NI|49661,Cloppenburg,NI|49681,Garrel,NI|49685,Bühren,NI|49688,Lastrup,NI|49692,Cappeln,NI|49696,Dwergte,NI|49699,Lindern,NI|49716,Meppen,NI|49733,Haren,NI|49740,Haselünne,NI|49744,Geeste,NI|49751,Hüven,NI|49757,Lahn,NI|49762,Fresenburg,NI|49767,Twist,NI|49770,Dohren,NI|49774,Lähden,NI|49777,Groß Berßen,NI|49779,Niederlangen,NI|49808,Lingen,NI|49809,Lingen,NI|49811,Lingen,NI|49824,Emlichheim,NI|49828,Esche,NI|49832,Andervenne,NI|49835,Wietmarschen,NI|49838,Gersten,NI|49843,Getelo,NI|49844,Bawinkel,NI|49846,Hoogstede,NI|49847,Itterbeck,NI|49849,Wilsum,NI|50126,Bergheim,NW|50127,Bergheim,NW|50129,Bergheim,NW|50169,Kerpen,NW|50170,Kerpen,NW|50171,Kerpen,NW|50181,Bedburg,NW|50189,Elsdorf,NW|50226,Frechen,NW|50259,Pulheim,NW|50321,Brühl,NW|50354,Hürth,NW|50374,Erftstadt,NW|50389,Wesseling,NW|50667,Köln,NW|50668,Köln,NW|50670,Köln,NW|50672,Köln,NW|50674,Köln,NW|50676,Köln,NW|50677,Köln,NW|50678,Köln,NW|50679,Köln,NW|50733,Köln,NW|50735,Köln,NW|50737,Köln,NW|50739,Köln,NW|50765,Köln,NW|50767,Köln,NW|50769,Köln,NW|50823,Köln,NW|50825,Köln,NW|50827,Köln,NW|50829,Köln,NW|50858,Köln,NW|50859,Köln,NW|50931,Köln,NW|50933,Köln,NW|50935,Köln,NW|50937,Köln,NW|50939,Köln,NW|50968,Köln,NW|50969,Köln,NW|50996,Köln,NW|50997,Köln,NW|50999,Köln,NW|51061,Köln,NW|51063,Köln,NW|51065,Köln,NW|51067,Köln,NW|51069,Köln,NW|51103,Köln,NW|51105,Köln,NW|51107,Köln,NW|51109,Köln,NW|51143,Köln,NW|51145,Köln,NW|51147,Köln,NW|51149,Köln,NW|51371,Leverkusen,NW|51373,Leverkusen,NW|51375,Leverkusen,NW|51377,Leverkusen,NW|51379,Leverkusen,NW|51381,Leverkusen,NW|51399,Burscheid,NW|51427,Bergisch Gladbach,NW|51429,Bergisch Gladbach,NW|51465,Bergisch Gladbach,NW|51467,Bergisch Gladbach,NW|51469,Bergisch Gladbach,NW|51491,Overath,NW|51503,Rösrath,NW|51515,Kürten,NW|51519,Odenthal,NW|51545,Waldbröl,NW|51570,Windeck,NW|51580,Reichshof,NW|51588,Nümbrecht,NW|51597,Morsbach,NW|51598,Friesenhagen,RP|51643,Gummersbach,NW|51645,Gummersbach,NW|51647,Gummersbach,NW|51674,Wiehl,NW|51688,Wipperfürth,NW|51702,Bergneustadt,NW|51709,Marienheide,NW|51766,Engelskirchen,NW|51789,Lindlar,NW|52062,Aachen,NW|52064,Aachen,NW|52066,Aachen,NW|52068,Aachen,NW|52070,Aachen,NW|52072,Aachen,NW|52074,Aachen,NW|52076,Aachen,NW|52078,Aachen,NW|52080,Aachen,NW|52134,Herzogenrath,NW|52146,Würselen,NW|52152,Simmerath,NW|52156,Monschau,NW|52159,Roetgen,NW|52222,Stolberg,NW|52223,Stolberg,NW|52224,Stolberg,NW|52249,Eschweiler,NW|52349,Düren,NW|52351,Düren,NW|52353,Düren,NW|52355,Düren,NW|52372,Kreuzau,NW|52379,Langerwehe,NW|52382,Niederzier,NW|52385,Nideggen,NW|52388,Nörvenich,NW|52391,Vettweiß,NW|52393,Hürtgenwald,NW|52396,Heimbach,NW|52399,Merzenich,NW|52428,Jülich,NW|52441,Linnich,NW|52445,Titz,NW|52457,Aldenhoven,NW|52459,Inden,NW|52477,Alsdorf,NW|52499,Baesweiler,NW|52511,Geilenkirchen,NW|52525,Heinsberg,NW|52531,Übach-Palenberg,NW|52538,Gangelt,NW|53111,Bonn,NW|53113,Bonn,NW|53115,Bonn,NW|53117,Bonn,NW|53119,Bonn,NW|53121,Bonn,NW|53123,Bonn,NW|53125,Bonn,NW|53127,Bonn,NW|53129,Bonn,NW|53173,Bonn,NW|53175,Bonn,NW|53177,Bonn,NW|53179,Bonn,NW|53225,Bonn,NW|53227,Bonn,NW|53229,Bonn,NW|53332,Bornheim,NW|53340,Meckenheim,NW|53343,Wachtberg,NW|53347,Alfter,NW|53359,Rheinbach,NW|53424,Calmuth,RP|53426,Dedenbach,RP|53474,Bad Neuenahr-Ahrweiler,RP|53489,Sinzig,RP|53498,Bad Breisig,RP|53501,Grafschaft,RP|53505,Altenahr,RP|53506,Ahrbrück,RP|53507,Dernau,RP|53508,Mayschoß,RP|53518,Adenau,RP|53520,Bierschbacher Mühle,RP|53533,Antweiler,RP|53534,Barweiler,RP|53539,Bodenbach,RP|53545,Linz,RP|53547,Alsau,RP|53557,Bad Hönningen,RP|53560,Kretzhaus,RP|53562,Hähnen,RP|53567,Asbach,RP|53572,Bruchhausen,RP|53577,Neustadt,RP|53578,Windhagen,RP|53579,Erpel,RP|53604,Bad Honnef,NW|53619,Rheinbreitbach,RP|53639,Königswinter,NW|53721,Siegburg,NW|53757,Sankt Augustin,NW|53773,Hennef,NW|53783,Eitorf,NW|53797,Lohmar,NW|53804,Much,NW|53809,Ruppichteroth,NW|53819,Neunkirchen-Seelscheid,NW|53840,Troisdorf,NW|53842,Troisdorf,NW|53844,Troisdorf,NW|53859,Niederkassel,NW|53879,Euskirchen,NW|53881,Euskirchen,NW|53894,Mechernich,NW|53902,Bad Münstereifel,NW|53909,Zülpich,NW|53913,Swisttal,NW|53919,Weilerswist,NW|53925,Kall,NW|53937,Schleiden,NW|53940,Hellenthal,NW|53945,Blankenheim,NW|53947,Nettersheim,NW|53949,Dahlem,NW|54290,Trier,RP|54292,Trier,RP|54293,Trier,RP|54294,Trier,RP|54295,Trier,RP|54296,Trier,RP|54298,Aach,RP|54306,Kordel,RP|54308,Langsur,RP|54309,Newel,RP|54310,Menningen,RP|54311,Trierweiler,RP|54313,Zemmer,RP|54314,Baldringen,RP|54316,Bonerath,RP|54317,Farschweiler,RP|54318,Mertesdorf,RP|54320,Waldrach,RP|54329,Konz,RP|54331,Oberbillig,RP|54332,Wasserliesch,RP|54338,Longen,RP|54340,Bekond,RP|54341,Fell,RP|54343,Föhren,RP|54344,Kenn,RP|54346,Mehring,RP|54347,Neumagen-Dhron,RP|54349,Trittenheim,RP|54411,Deuselbach,RP|54413,Bescheid,RP|54421,Hinzert-Pölert,RP|54422,Börfink,RP|54424,Burtscheid,RP|54426,Berglicht,RP|54427,Kell,RP|54429,Heddert,RP|54439,Fisch,RP|54441,Ayl,RP|54450,Freudenburg,RP|54451,Irsch,RP|54453,Nittel,RP|54455,Serrig,RP|54456,Onsdorf,RP|54457,Wincheringen,RP|54459,Wiltingen,RP|54470,Bernkastel-Kues,RP|54472,Brauneberg,RP|54483,Kleinich,RP|54484,Maring-Noviand,RP|54486,Mülheim,RP|54487,Wintrich,RP|54492,Altmachern,RP|54497,Horath,RP|54498,Piesport,RP|54516,Flußbach,RP|54518,Altrich,RP|54523,Dierscheid,RP|54524,Klausen,RP|54526,Landscheid,RP|54528,Salmtal,RP|54529,Spangdahlem,RP|54531,Buchholz, Gem Eckfeld,RP|54533,Bettenfeld,RP|54534,Großlittgen,RP|54536,Kröv,RP|54538,Bausendorf,RP|54539,Ürzig,RP|54550,Daun,RP|54552,Beinhausen,RP|54558,Gillenfeld,RP|54568,Gerolstein,RP|54570,Berlingen,RP|54574,Birresborn,RP|54576,Dohm-Lammersdorf,RP|54578,Basberg,RP|54579,Üxheim,RP|54584,Feusdorf,RP|54585,Esch,RP|54586,Schüller,RP|54587,Birgel,RP|54589,Kerschenbach,RP|54595,Gondenbrett,RP|54597,Auw,RP|54608,Bleialf,RP|54610,Büdesheim,RP|54611,Hallschlag,RP|54612,Lasel,RP|54614,Dingdorf,RP|54616,Winterspelt,RP|54617,Harspelt,RP|54619,Banzenhof,RP|54634,Birtlingen,RP|54636,Altenhof,RP|54646,Bettingen,RP|54647,Dudeldorf,RP|54649,Dackscheid,RP|54655,Altenhof,RP|54657,Badem,RP|54662,Beilingen,RP|54664,Auw,RP|54666,Irrel,RP|54668,Alsdorf,RP|54669,Bollendorf,RP|54673,Ammeldingen,RP|54675,Ammeldingen,RP|54687,Arzfeld,RP|54689,Affler,RP|55116,Mainz,RP|55118,Mainz,RP|55120,Mainz,RP|55122,Mainz,RP|55124,Mainz,RP|55126,Mainz,RP|55127,Mainz,RP|55128,Mainz,RP|55129,Mainz,RP|55130,Mainz,RP|55131,Mainz,RP|55218,Ingelheim,RP|55232,Alzey,RP|55234,Albig,RP|55237,Bornheim,RP|55239,Gau-Odernheim,RP|55246,Mainz-Kostheim,HE|55252,Mainz-Kastel,HE|55257,Budenheim,RP|55262,Heidesheim,RP|55263,Wackernheim,RP|55268,Nieder-Olm,RP|55270,Bubenheim,RP|55271,Stadecken-Elsheim,RP|55276,Dienheim,RP|55278,Dalheim,RP|55283,Nierstein,RP|55286,Sulzheim,RP|55288,Armsheim,RP|55291,Saulheim,RP|55294,Bodenheim,RP|55296,Gau-Bischofsheim,RP|55299,Nackenheim,RP|55411,Bingen,RP|55413,Manubach,RP|55422,Bacharach,RP|55424,Münster-Sarmsheim,RP|55425,Waldalgesheim,RP|55430,Oberwesel,RP|55432,Damscheid,RP|55435,Gau-Algesheim,RP|55437,Appenheim,RP|55442,Daxweiler,RP|55444,Dörrebach,RP|55450,Langenlonsheim,RP|55452,Dorsheim,RP|55457,Gensingen,RP|55459,Aspisheim,RP|55469,Altweidelbach,RP|55471,Biebern,RP|55481,Dillendorf,RP|55483,Bärenbach,RP|55487,Dill,RP|55490,Gehlweiler,RP|55491,Büchenbeuren,RP|55494,Benzweiler,RP|55496,Argenthal,RP|55497,Ellern,RP|55499,Riesweiler,RP|55543,Bad Kreuznach,RP|55545,Bad Kreuznach,RP|55546,Biebelsheim,RP|55559,Bretzenheim,RP|55566,Bad Sobernheim,RP|55568,Abtweiler,RP|55569,Auen,RP|55571,Odernheim,RP|55576,Badenheim,RP|55578,Gau-Weinheim,RP|55583,Bad Münster-Ebernburg,RP|55585,Altenbamberg,RP|55590,Meisenheim,RP|55592,Breitenheim,RP|55593,Rüdesheim,RP|55595,Allenfeld,RP|55596,Oberstreit,RP|55597,Gumbsheim,RP|55599,Eckelsheim,RP|55606,Bärweiler,RP|55608,Becherbach,RP|55618,Simmertal,RP|55619,Hennweiler,RP|55621,Hundsbach,RP|55624,Bollenbach,RP|55626,Bundenbach,RP|55627,Martinstein,RP|55629,Schwarzerden,RP|55743,Fischbach,RP|55756,Herrstein,RP|55758,Allenbach,RP|55765,Birkenfeld,RP|55767,Abentheuer,RP|55768,Hoppstädten-Weiersbach,RP|55774,Baumholder,RP|55776,Berglangenbach,RP|55777,Berschweiler,RP|55779,Heimbach,RP|56068,Koblenz,RP|56070,Koblenz,RP|56072,Koblenz,RP|56073,Koblenz,RP|56075,Koblenz,RP|56076,Koblenz,RP|56077,Koblenz,RP|56112,Lahnstein,RP|56130,Altes Forsthaus,RP|56132,Becheln,RP|56133,Fachbach,RP|56154,Boppard,RP|56170,Bembsmühle,RP|56179,Niederwerth,RP|56182,Urbar,RP|56191,Weitersburg,RP|56203,Bembermühle,RP|56204,Hillscheid,RP|56206,Hilgert,RP|56218,Mülheim-Kärlich,RP|56220,Bassenheim,RP|56235,Faulbach,RP|56237,Alsbach,RP|56242,Ellenhausen,RP|56244,Arnshöfen,RP|56249,Herschbach,RP|56253,Treis-Karden,RP|56254,Moselkern,RP|56269,Dierdorf,RP|56271,Isenburg,RP|56276,Großmaischeid,RP|56281,Dörth,RP|56283,Beulich,RP|56288,Alterkülz,RP|56290,Beltheim,RP|56291,Badenhard,RP|56294,Gappenach,RP|56295,Kerben,RP|56299,Achterspannerhof,RP|56305,Döttesfeld,RP|56307,Dernbach,RP|56316,Hanroth,RP|56317,Linkenbach,RP|56321,Brey,RP|56322,Spay,RP|56323,Hünenfeld,RP|56329,St. Goar,RP|56330,Fißmühle,RP|56332,Alken,RP|56333,Winningen,RP|56335,Neuhäusel,RP|56337,Arzbach,RP|56338,Braubach,RP|56340,Büchelborn,RP|56341,Filsen,RP|56346,Bornsmühle,RP|56348,Bornich,RP|56349,Kaub,RP|56355,Aftholderbach,RP|56357,Auel,RP|56368,Berghausen,RP|56370,Allendorf,RP|56377,Gieshübel,RP|56379,Arnstein,RP|56410,Montabaur,RP|56412,Boden,RP|56414,Berod,RP|56422,Wirges,RP|56424,Bannberscheid,RP|56427,Siershahn,RP|56428,Dernbach,RP|56457,Halbs,RP|56459,Ailertchen,RP|56462,Hilpischmühle,RP|56470,Bad Marienberg,RP|56472,Dammühle,RP|56477,Nister-Möhrendorf,RP|56479,Bretthausen,RP|56564,Neuwied,RP|56566,Neuwied,RP|56567,Neuwied,RP|56575,Weißenthurm,RP|56579,Bonefeld,RP|56581,Ehlscheid,RP|56584,Anhausen,RP|56587,Oberhonnefeld-Gierend,RP|56588,Bremscheid,RP|56589,Datzeroth,RP|56593,Bürdenbach,RP|56594,Willroth,RP|56598,Hammerstein,RP|56599,Leutesdorf,RP|56626,Andernach,RP|56630,Kretz,RP|56637,Plaidt,RP|56642,Kruft,RP|56645,Nickenich,RP|56648,Saffig,RP|56651,Brenk,RP|56653,Glees,RP|56656,Brohl-Lützing,RP|56659,Burgbrohl,RP|56727,Brachems,RP|56729,Acht,RP|56736,Kottenheim,RP|56743,Mendig,RP|56745,Bell,RP|56746,Hohenleimbach,RP|56751,Einig,RP|56753,Mertloch,RP|56754,Binningen,RP|56759,Eppenberg,RP|56761,Brachtendorf,RP|56766,Auderath,RP|56767,Gunderath,RP|56769,Arbach,RP|56812,Cochem,RP|56814,Beilstein,RP|56818,Klotten,RP|56820,Briedern,RP|56821,Ellenz-Poltersdorf,RP|56823,Büchel,RP|56825,Beuren,RP|56826,Heckenhof,RP|56828,Alflen,RP|56829,Brieden,RP|56841,Hödeshof,RP|56843,Burg,RP|56850,Briedeler Heck,RP|56856,Zell,RP|56858,Altlay,RP|56859,Alf,RP|56861,Reil,RP|56862,Pünderich,RP|56864,Bad Bertrich,RP|56865,Blankenrath,RP|56867,Briedel,RP|56869,Mastershausen,RP|57072,Siegen,NW|57074,Siegen,NW|57076,Siegen,NW|57078,Siegen,NW|57080,Siegen,NW|57223,Kreuztal,NW|57234,Wilnsdorf,NW|57250,Netphen,NW|57258,Freudenberg,NW|57271,Hilchenbach,NW|57290,Neunkirchen,NW|57299,Burbach,NW|57319,Bad Berleburg,NW|57334,Bad Laasphe,NW|57339,Erndtebrück,NW|57368,Lennestadt,NW|57392,Schmallenberg,NW|57399,Kirchhundem,NW|57413,Finnentrop,NW|57439,Attendorn,NW|57462,Olpe,NW|57482,Wenden,NW|57489,Drolshagen,NW|57518,Alsdorf,RP|57520,Derschen,RP|57537,Dellingen,RP|57539,Bitzen,RP|57548,Diedenberg,RP|57555,Brachbach,RP|57562,Herdorf,RP|57567,Daaden,RP|57572,Harbach,RP|57577,Hamm,RP|57578,Elkenroth,RP|57580,Elben,RP|57581,Katzwinkel,RP|57583,Mörlen,RP|57584,Scheuerfeld,RP|57586,Weitefeld,RP|57587,Birken-Honigsessen,RP|57589,Birkenbeul,RP|57610,Almersbach,RP|57612,Birnbach,RP|57614,Alberthofen,RP|57627,Astert,RP|57629,Atzelgift,RP|57632,Berzhausen,RP|57635,Ersfeld,RP|57636,Mammelzen,RP|57638,Neitersen,RP|57639,Oberdreis,RP|57641,Oberlahr,RP|57642,Alpenrod,RP|57644,Hattert,RP|57645,Kellershof,RP|57647,Enspel,RP|57648,Bölsberg,RP|58089,Hagen,NW|58091,Hagen,NW|58093,Hagen,NW|58095,Hagen,NW|58097,Hagen,NW|58099,Hagen,NW|58119,Hagen,NW|58135,Hagen,NW|58239,Schwerte,NW|58256,Ennepetal,NW|58285,Gevelsberg,NW|58300,Wetter,NW|58313,Herdecke,NW|58332,Schwelm,NW|58339,Breckerfeld,NW|58452,Witten,NW|58453,Witten,NW|58454,Witten,NW|58455,Witten,NW|58456,Witten,NW|58507,Lüdenscheid,NW|58509,Lüdenscheid,NW|58511,Lüdenscheid,NW|58513,Lüdenscheid,NW|58515,Lüdenscheid,NW|58540,Meinerzhagen,NW|58553,Halver,NW|58566,Kierspe,NW|58579,Schalksmühle,NW|58636,Iserlohn,NW|58638,Iserlohn,NW|58640,Iserlohn,NW|58642,Iserlohn,NW|58644,Iserlohn,NW|58675,Hemer,NW|58706,Menden,NW|58708,Menden,NW|58710,Menden,NW|58730,Fröndenberg,NW|58739,Wickede,NW|58762,Altena,NW|58769,Nachrodt-Wiblingwerde,NW|58791,Werdohl,NW|58802,Balve,NW|58809,Neuenrade,NW|58840,Plettenberg,NW|58849,Herscheid,NW|59063,Hamm,NW|59065,Hamm,NW|59067,Hamm,NW|59069,Hamm,NW|59071,Hamm,NW|59073,Hamm,NW|59075,Hamm,NW|59077,Hamm,NW|59174,Kamen,NW|59192,Bergkamen,NW|59199,Bönen,NW|59227,Ahlen,NW|59229,Ahlen,NW|59269,Beckum,NW|59302,Oelde,NW|59320,Ennigerloh,NW|59329,Wadersloh,NW|59348,Lüdinghausen,NW|59368,Werne,NW|59379,Selm,NW|59387,Ascheberg,NW|59394,Nordkirchen,NW|59399,Olfen,NW|59423,Unna,NW|59425,Unna,NW|59427,Unna,NW|59439,Holzwickede,NW|59457,Werl,NW|59469,Ense,NW|59494,Soest,NW|59505,Bad Sassendorf,NW|59510,Lippetal,NW|59514,Welver,NW|59519,Möhnesee,NW|59555,Lippstadt,NW|59556,Lippstadt,NW|59557,Lippstadt,NW|59558,Lippstadt,NW|59581,Warstein,NW|59590,Geseke,NW|59597,Erwitte,NW|59602,Rüthen,NW|59609,Anröchte,NW|59755,Arnsberg,NW|59757,Arnsberg,NW|59759,Arnsberg,NW|59821,Arnsberg,NW|59823,Arnsberg,NW|59846,Sundern,NW|59872,Meschede,NW|59889,Eslohe,NW|59909,Bestwig,NW|59929,Brilon,NW|59939,Olsberg,NW|59955,Winterberg,NW|59964,Medebach,NW|59969,Bromskirchen,HE|60308,Frankfurt,HE|60311,Frankfurt,HE|60313,Frankfurt,HE|60314,Frankfurt,HE|60316,Frankfurt,HE|60318,Frankfurt,HE|60320,Frankfurt,HE|60322,Frankfurt,HE|60323,Frankfurt,HE|60325,Frankfurt,HE|60326,Frankfurt,HE|60327,Frankfurt,HE|60329,Frankfurt,HE|60385,Frankfurt,HE|60386,Frankfurt,HE|60388,Frankfurt,HE|60389,Frankfurt,HE|60431,Frankfurt,HE|60433,Frankfurt,HE|60435,Frankfurt,HE|60437,Frankfurt,HE|60438,Frankfurt,HE|60439,Frankfurt,HE|60486,Frankfurt,HE|60487,Frankfurt,HE|60488,Frankfurt,HE|60489,Frankfurt,HE|60528,Frankfurt,HE|60529,Frankfurt,HE|60549,Frankfurt,HE|60594,Frankfurt,HE|60596,Frankfurt,HE|60598,Frankfurt,HE|60599,Frankfurt,HE|61118,Bad Vilbel,HE|61130,Nidderau,HE|61137,Schöneck,HE|61138,Niederdorfelden,HE|61169,Friedberg,HE|61184,Karben,HE|61191,Rosbach,HE|61194,Niddatal,HE|61197,Florstadt,HE|61200,Am Römerhof,HE|61203,Bingenheimer Mühle,HE|61206,Wöllstadt,HE|61209,Echzell,HE|61231,Bad Nauheim,HE|61239,Ober-Mörlen,HE|61250,Erdfunkstelle Usingen,HE|61267,Neu-Anspach,HE|61273,Saalburg,HE|61276,Weilrod,HE|61279,Grävenwiesbach,HE|61348,Bad Homburg,HE|61350,Bad Homburg,HE|61352,Bad Homburg,HE|61381,Friedrichsdorf,HE|61389,Schmitten,HE|61440,Oberursel,HE|61449,Steinbach,HE|61462,Königstein,HE|61476,Kronberg,HE|61479,Glashütten,HE|63065,Offenbach,HE|63067,Offenbach,HE|63069,Offenbach,HE|63071,Offenbach,HE|63073,Offenbach,HE|63075,Offenbach,HE|63110,Rodgau,HE|63128,Dietzenbach,HE|63150,Heusenstamm,HE|63165,Mühlheim,HE|63179,Obertshausen,HE|63225,Langen,HE|63263,Neu-Isenburg,HE|63303,Dreieich,HE|63322,Rödermark,HE|63329,Egelsbach,HE|63450,Hanau,HE|63452,Hanau,HE|63454,Hanau,HE|63456,Hanau,HE|63457,Hanau,HE|63477,Maintal,HE|63486,Bruchköbel,HE|63500,Seligenstadt,HE|63505,Hof Eckeberg,HE|63512,Hainburg,HE|63517,Rodenbach,HE|63526,Erlensee,HE|63533,Mainhausen,HE|63538,Großkrotzenburg,HE|63543,Bei den Tongruben,HE|63546,Hammersbach,HE|63549,Ronneburg,HE|63571,Gelnhausen,HE|63579,Freigericht,HE|63584,Gründau,HE|63589,Linsengericht,HE|63594,Hasselroth,HE|63599,Biebergemünd,HE|63607,Wächtersbach,HE|63619,Bad Orb,HE|63628,Bad Soden-Salmünster,HE|63633,Birstein,HE|63636,Brachttal,HE|63637,Jossgrund,HE|63639,Flörsbachtal,HE|63654,Büdingen,HE|63667,Nidda,HE|63674,Altenstadt,HE|63679,Schotten,HE|63683,Ortenberg,HE|63688,Gedern,HE|63691,Ranstadt,HE|63694,Limeshain,HE|63695,Glauburg,HE|63697,Hirzenhain,HE|63699,Birkenstöcke,HE|63739,Aschaffenburg,BY|63741,Aschaffenburg,BY|63743,Aschaffenburg,BY|63755,Alzenau,BY|63762,Großostheim,BY|63768,Hösbach,BY|63773,Goldbach,BY|63776,Hüttelngesäß,HE|63785,Obernburg,BY|63791,Karlstein,BY|63796,Kahl,BY|63801,Kleinostheim,BY|63808,Haibach,BY|63811,Stockstadt,BY|63814,Mainaschaff,BY|63820,Elsenfeld,BY|63825,Blankenbach,BY|63826,Geiselbach,BY|63828,Kleinkahl,BY|63829,Krombach,BY|63831,Wiesen,BY|63834,Sulzbach,BY|63839,Kleinwallstadt,BY|63840,Hausen,BY|63843,Niedernberg,BY|63846,Laufach,BY|63849,Leidersbach,BY|63853,Mömlingen,BY|63856,Bessenbach,BY|63857,Waldaschaff,BY|63860,Rothenbuch,BY|63863,Eschau,BY|63864,Glattbach,BY|63867,Johannesberg,BY|63868,Großwallstadt,BY|63869,Heigenbrücken,BY|63871,Heinrichsthal,BY|63872,Heimbuchenthal,BY|63874,Dammbach,BY|63875,Mespelbrunn,BY|63877,Sailauf,BY|63879,Weibersbrunn,BY|63897,Miltenberg,BY|63906,Erlenbach,BY|63911,Klingenberg,BY|63916,Amorbach,BY|63920,Großheubach,BY|63924,Kleinheubach,BY|63925,Brunnthal,BY|63927,Bürgstadt,BY|63928,Eichenbühl,BY|63930,Neunkirchen,BY|63931,Kirchzell,BY|63933,Mönchberg,BY|63934,Röllbach,BY|63936,Schneeberg,BY|63937,Weilbach,BY|63939,Wörth,BY|64283,Darmstadt,HE|64285,Darmstadt,HE|64287,Darmstadt,HE|64289,Darmstadt,HE|64291,Darmstadt,HE|64293,Darmstadt,HE|64295,Darmstadt,HE|64297,Darmstadt,HE|64319,Pfungstadt,HE|64331,Weiterstadt,HE|64342,Seeheim-Jugenheim,HE|64347,Griesheim,HE|64354,Reinheim,HE|64367,Mühltal,HE|64372,Ober-Ramstadt,HE|64380,Roßdorf,HE|64385,Gumpener Kreuz,HE|64390,Erzhausen,HE|64395,Brensbach,HE|64397,Modautal,HE|64401,Groß-Bieberau,HE|64404,Bickenbach,HE|64405,Fischbachtal,HE|64407,Fränkisch-Crumbach,HE|64409,Messel,HE|64521,Groß-Gerau,HE|64546,Mörfelden-Walldorf,HE|64560,Riedstadt,HE|64569,Nauheim,HE|64572,Büttelborn,HE|64579,Gernsheim,HE|64584,Biebesheim,HE|64589,Stockstadt,HE|64625,Bensheim,HE|64646,Heppenheim,HE|64653,Lorsch,HE|64658,Faustenbach,HE|64665,Alsbach-Hähnlein,HE|64668,Rimbach,HE|64673,Zwingenberg,HE|64678,Lindenfels,HE|64683,Einhausen,HE|64686,Lautertal,HE|64689,Grasellenbach,HE|64711,Erbach,HE|64720,Michelstadt,HE|64732,Bad König,HE|64739,Höchst,HE|64743,Beerfelden,HE|64747,Breuberg,HE|64750,Lützelbach,HE|64753,Brombachtal,HE|64754,Badisch Schöllenbach,BW|64756,Mossautal,HE|64757,Rothenberg,HE|64759,Sensbachtal,HE|64807,Dieburg,HE|64823,Groß-Umstadt,HE|64832,Babenhausen,HE|64839,Münster,HE|64846,Groß-Zimmern,HE|64850,Schaafheim,HE|64853,Otzberg,HE|64859,Eppertshausen,HE|65183,Wiesbaden,HE|65185,Wiesbaden,HE|65187,Wiesbaden,HE|65189,Wiesbaden,HE|65191,Wiesbaden,HE|65193,Wiesbaden,HE|65195,Wiesbaden,HE|65197,Wiesbaden,HE|65199,Wiesbaden,HE|65201,Wiesbaden,HE|65203,Wiesbaden,HE|65205,Wiesbaden,HE|65207,Wiesbaden,HE|65232,Taunusstein,HE|65239,Hochheim,HE|65307,Bad Schwalbach,HE|65321,Heidenrod,HE|65326,Aarbergen,HE|65329,Hohenstein,HE|65343,Eltville,HE|65344,Eltville,HE|65345,Eltville,HE|65346,Eltville,HE|65347,Eltville,HE|65366,Geisenheim,HE|65375,Oestrich-Winkel,HE|65385,Am Rüdesheimer Hafen,HE|65388,Schlangenbad,HE|65391,Lorch,HE|65396,Walluf,HE|65399,Kiedrich,HE|65428,Rüsselsheim,HE|65439,Flörsheim,HE|65451,Kelsterbach,HE|65462,Ginsheim-Gustavsburg,HE|65468,Trebur,HE|65474,Bischofsheim,HE|65479,Raunheim,HE|65510,Hasenmühle,HE|65520,Bad Camberg,HE|65527,Niedernhausen,HE|65529,Waldems,HE|65549,Limburg,HE|65550,Limburg,HE|65551,Limburg,HE|65552,Limburg,HE|65553,Limburg,HE|65554,Limburg,HE|65555,Limburg,HE|65556,Limburg,HE|65558,Balduinstein,RP|65582,Aull,RP|65589,Hadamar,HE|65594,Runkel,HE|65597,Hünfelden,HE|65599,Dornburg,HE|65604,Elz,HE|65606,Villmar,HE|65611,Brechen,HE|65614,Beselich,HE|65618,Selters,HE|65620,Waldbrunn,HE|65623,Hahnstätten,RP|65624,Altendiez,RP|65626,Birlenbach,RP|65627,Elbtal,HE|65629,Niederneisen,RP|65719,Hofheim,HE|65760,Eschborn,HE|65779,Kelkheim,HE|65795,Hattersheim,HE|65812,Bad Soden,HE|65817,Eppstein,HE|65824,Schwalbach,HE|65830,Kriftel,HE|65835,Liederbach,HE|65843,Sulzbach,HE|65929,Frankfurt,HE|65931,Frankfurt,HE|65933,Frankfurt,HE|65934,Frankfurt,HE|65936,Frankfurt,HE|66111,Saarbrücken,SL|66113,Saarbrücken,SL|66115,Saarbrücken,SL|66117,Saarbrücken,SL|66119,Saarbrücken,SL|66121,Saarbrücken,SL|66123,Saarbrücken,SL|66125,Saarbrücken,SL|66126,Saarbrücken,SL|66127,Saarbrücken,SL|66128,Saarbrücken,SL|66129,Saarbrücken,SL|66130,Saarbrücken,SL|66131,Saarbrücken,SL|66132,Saarbrücken,SL|66133,Saarbrücken,SL|66265,Heusweiler,SL|66271,Kleinblittersdorf,SL|66280,Sulzbach,SL|66287,Quierschied,SL|66292,Riegelsberg,SL|66299,Friedrichsthal,SL|66333,Völklingen,SL|66346,Püttlingen,SL|66352,Großrosseln,SL|66359,Bous,SL|66386,St. Ingbert,SL|66399,Mandelbachtal,SL|66424,Homburg,SL|66440,Blieskastel,SL|66450,Bexbach,SL|66453,Gersheim,SL|66459,Kirkel,SL|66482,Faustermühle,RP|66484,Althornbach,RP|66497,Contwig,RP|66500,Bödingerhof,RP|66501,Großbundenbach,RP|66503,Dellfeld,RP|66504,Bottenbach,RP|66506,Maßweiler,RP|66507,Reifenberg,RP|66509,Rieschweiler-Mühlbach,RP|66538,Neunkirchen,SL|66539,Neunkirchen,SL|66540,Neunkirchen,SL|66557,Illingen,SL|66564,Ottweiler,SL|66571,Eppelborn,SL|66578,Schiffweiler,SL|66583,Spiesen-Elversberg,SL|66589,Merchweiler,SL|66606,St. Wendel,SL|66620,Nonnweiler,SL|66625,Nohfelden,SL|66629,Freisen,SL|66636,Tholey,SL|66640,Namborn,SL|66646,Marpingen,SL|66649,Oberthal,SL|66663,Merzig,SL|66679,Losheim,SL|66687,Wadern,SL|66693,Mettlach,SL|66701,Beckingen,SL|66706,Perl,SL|66709,Weiskirchen,SL|66740,Saarlouis,SL|66763,Dillingen,SL|66773,Schwalbach,SL|66780,Rehlingen-Siersburg,SL|66787,Wadgassen,SL|66793,Saarwellingen,SL|66798,Wallerfangen,SL|66802,Überherrn,SL|66806,Ensdorf,SL|66809,Nalbach,SL|66822,Lebach,SL|66839,Schmelz,SL|66849,Am Sandweiher,RP|66851,Bann,RP|66862,Kindsbach,RP|66869,Blaubach,RP|66871,Albessen,RP|66877,Ramstein-Miesenbach,RP|66879,Kollweiler,RP|66882,Hütschenhausen,RP|66885,Altenglan,RP|66887,Bosenbach,RP|66892,Bruchmühlbach-Miesau,RP|66894,Bechhofen,RP|66901,Schönenberg-Kübelberg,RP|66903,Altenkirchen,RP|66904,Börsborn,RP|66907,Glan-Münchweiler,RP|66909,Henschtal,RP|66914,Waldmohr,RP|66916,Breitenbach,RP|66917,Biedershausen,RP|66919,Hermersberg,RP|66953,Pirmasens,RP|66954,Pirmasens,RP|66955,Beckenhof,RP|66957,Eppenbrunn,RP|66969,Lemberg,RP|66976,Rodalben,RP|66978,Clausen,RP|66981,Münchweiler,RP|66987,Thaleischweiler-Fröschen,RP|66989,Dusenbrücken,RP|66994,Dahn,RP|66996,Bärenbrunnerhof,RP|66999,Hinterweidenthal,RP|67059,Ludwigshafen,RP|67061,Ludwigshafen,RP|67063,Ludwigshafen,RP|67065,Ludwigshafen,RP|67067,Ludwigshafen,RP|67069,Ludwigshafen,RP|67071,Ludwigshafen,RP|67098,Annaberg,RP|67105,Schifferstadt,RP|67112,Mutterstadt,RP|67117,Limburgerhof,RP|67122,Altrip,RP|67125,Dannstadt-Schauernheim,RP|67126,Hochdorf-Assenheim,RP|67127,Rödersheim-Gronau,RP|67133,Maxdorf,RP|67134,Birkenheide,RP|67136,Fußgönheim,RP|67141,Neuhofen,RP|67146,Deidesheim,RP|67147,Forst,RP|67149,Meckenheim,RP|67150,Niederkirchen,RP|67152,Ruppertsberg,RP|67157,Silbertal,RP|67158,Ellerstadt,RP|67159,Friedelsheim,RP|67161,Gönnheim,RP|67165,Waldsee,RP|67166,Otterstadt,RP|67167,Erpolzheim,RP|67169,Kallstadt,RP|67227,Frankenthal,RP|67229,Gerolsheim,RP|67240,Bobenheim-Roxheim,RP|67245,Lambsheim,RP|67246,Dirmstein,RP|67251,Freinsheim,RP|67256,Weisenheim am Sand,RP|67258,Heßheim,RP|67259,Beindersheim,RP|67269,Grünstadt,RP|67271,Battenberg,RP|67273,Bobenheim am Berg,RP|67278,Bockenheim,RP|67280,Ebertsheim,RP|67281,Bissersheim,RP|67283,Obrigheim,RP|67292,Bolanderhof,RP|67294,Bischheim,RP|67295,Bolanden,RP|67297,Heyerhof,RP|67304,Eisenberg,RP|67305,Ochsenbusch,RP|67307,Göllheim,RP|67308,Albisheim,RP|67310,Hettenleidelheim,RP|67311,Nackterhof,RP|67316,Carlsberg,RP|67317,Altleiningen,RP|67319,Lauberhof,RP|67346,Angelhof I u. II,RP|67354,Römerberg,RP|67360,Lingenfeld,RP|67361,Freisbach,RP|67363,Lustadt,RP|67365,Schwegenheim,RP|67366,Weingarten,RP|67368,Westheim,RP|67373,Dudenhofen,RP|67374,Hanhofen,RP|67376,Harthausen,RP|67377,Gommersheim,RP|67378,Zeiskam,RP|67433,Neustadt,RP|67434,Neustadt,RP|67435,Benjental,RP|67454,Haßloch,RP|67459,Böhl-Iggelheim,RP|67466,Breitenstein,RP|67468,Erlenbacher Forsthaus,RP|67471,Elmstein,RP|67472,Esthal,RP|67473,Lindenberg,RP|67475,Weidenthal,RP|67480,Edenkoben,RP|67482,Altdorf,RP|67483,Edesheim,RP|67487,Maikammer,RP|67489,Kirrweiler,RP|67547,Worms,RP|67549,Worms,RP|67550,Worms,RP|67551,Worms,RP|67574,Osthofen,RP|67575,Eich,RP|67577,Alsheim,RP|67578,Gimbsheim,RP|67580,Hamm,RP|67582,Mettenheim,RP|67583,Guntersblum,RP|67585,Dorn-Dürkheim,RP|67586,Hillesheim,RP|67587,Wintersheim,RP|67590,Monsheim,RP|67591,Hohen-Sülzen,RP|67592,Flörsheim-Dalsheim,RP|67593,Bermersheim,RP|67595,Bechtheim,RP|67596,Dittelsheim-Heßloch,RP|67598,Gundersheim,RP|67599,Gundheim,RP|67655,Kaiserslautern,RP|67657,Kaiserslautern,RP|67659,Kaiserslautern,RP|67661,Breitenau,RP|67663,Kaiserslautern,RP|67677,Altenhof,RP|67678,Mehlingen,RP|67680,Eichenbachermühle,RP|67681,Sembach,RP|67685,Erzenhausen,RP|67686,Mackenbach,RP|67688,Rodenbach,RP|67691,Hochspeyer,RP|67693,Fischbach,RP|67697,Otterberg,RP|67699,Heiligenmoschel,RP|67700,Niederkirchen,RP|67701,Schallodenbach,RP|67705,Eisenschmelz,RP|67706,Krickenbach,RP|67707,Karlsthal Bahnhof,RP|67714,Heidelsburg,RP|67715,Geiselberg,RP|67716,Heltersberg,RP|67718,Schmalenberg,RP|67722,Winnweiler,RP|67724,Gehrweiler,RP|67725,Börrstadt,RP|67727,Lohnsfeld,RP|67728,Münchweiler,RP|67729,Sippersfeld,RP|67731,Dudenbacherhof,RP|67732,Hirschhorn,RP|67734,Katzweiler,RP|67735,Mehlbach,RP|67737,Frankelbach,RP|67742,Adenbach,RP|67744,Cronenberg,RP|67745,Grumbach,RP|67746,Langweiler,RP|67748,Odenbach,RP|67749,Nerzweiler,RP|67752,Oberweiler-Tiefenbach,RP|67753,Aschbach,RP|67754,Eßweiler,RP|67756,Hinzweiler,RP|67757,Kreimbach-Kaulbach,RP|67759,Nußbach,RP|67806,Bisterschied,RP|67808,Bayerfeld-Steckweiler,RP|67811,Dielkirchen,RP|67813,Gerbach,RP|67814,Dannenfels,RP|67816,Dreisen,RP|67817,Imsbach,RP|67819,Kriegsfeld,RP|67821,Alsenz,RP|67822,Bremricherhof,RP|67823,Bergmühle,RP|67824,Feilbingert,RP|67826,Hallgarten,RP|67827,Becherbach,RP|67829,Callbach,RP|68159,Mannheim,BW|68161,Mannheim,BW|68163,Mannheim,BW|68165,Mannheim,BW|68167,Mannheim,BW|68169,Mannheim,BW|68199,Mannheim,BW|68219,Mannheim,BW|68229,Mannheim,BW|68239,Mannheim,BW|68259,Mannheim,BW|68305,Mannheim,BW|68307,Mannheim,BW|68309,Mannheim,BW|68519,Viernheim,HE|68526,Ladenburg,BW|68535,Edingen-Neckarhausen,BW|68542,Heddesheim,BW|68549,Ilvesheim,BW|68623,Forsthaus Heide,HE|68642,Bürstadt,HE|68647,Biblis,HE|68649,Groß-Rohrheim,HE|68723,Oftersheim,BW|68753,Waghäusel,BW|68766,Hockenheim,BW|68775,Ketsch,BW|68782,Brühl,BW|68789,St. Leon-Rot,BW|68794,Oberhausen-Rheinhausen,BW|68799,Reilingen,BW|68804,Altlußheim,BW|68809,Neulußheim,BW|69115,Heidelberg,BW|69117,Heidelberg,BW|69118,Heidelberg,BW|69120,Heidelberg,BW|69121,Heidelberg,BW|69123,Heidelberg,BW|69124,Heidelberg,BW|69126,Heidelberg,BW|69151,Neckargemünd,BW|69168,Wiesloch,BW|69181,Leimen,BW|69190,Walldorf,BW|69198,Schriesheim,BW|69207,Sandhausen,BW|69214,Eppelheim,BW|69221,Dossenheim,BW|69226,Nußloch,BW|69231,Rauenberg,BW|69234,Dielheim,BW|69239,Neckarsteinach,HE|69242,Mühlhausen,BW|69245,Bammental,BW|69250,Schönau,BW|69251,Gaiberg,BW|69253,Heiligkreuzsteinach,BW|69254,Malsch,BW|69256,Mauer,BW|69257,Wiesenbach,BW|69259,Wilhelmsfeld,BW|69412,Eberbach,BW|69427,Mudau,BW|69429,Unterdielbach,BW|69434,Brombach,BW|69436,Schönbrunn,BW|69437,Neckargerach,BW|69439,Zwingenberg,BW|69469,Weinheim,BW|69483,Wald-Michelbach,HE|69488,Birkenau,HE|69493,Hirschberg,BW|69502,Hemsbach,BW|69509,Mörlenbach,HE|69514,Laudenbach,BW|69517,Gorxheimertal,HE|69518,Abtsteinach,HE|70173,Stuttgart,BW|70174,Stuttgart,BW|70176,Stuttgart,BW|70178,Stuttgart,BW|70180,Stuttgart,BW|70182,Stuttgart,BW|70184,Stuttgart,BW|70186,Stuttgart,BW|70188,Stuttgart,BW|70190,Stuttgart,BW|70191,Stuttgart,BW|70192,Stuttgart,BW|70193,Stuttgart,BW|70195,Stuttgart,BW|70197,Stuttgart,BW|70199,Stuttgart,BW|70327,Stuttgart,BW|70329,Stuttgart,BW|70372,Stuttgart,BW|70374,Stuttgart,BW|70376,Stuttgart,BW|70378,Sonnenhof,BW|70435,Stuttgart,BW|70437,Stuttgart,BW|70439,Stuttgart,BW|70469,Stuttgart,BW|70499,Stuttgart,BW|70563,Stuttgart,BW|70565,Stuttgart,BW|70567,Stuttgart,BW|70569,Stuttgart,BW|70597,Stuttgart,BW|70599,Stuttgart,BW|70619,Stuttgart,BW|70629,Stuttgart,BW|70734,Fellbach,BW|70736,Fellbach,BW|70771,Leinfelden-Echterdingen,BW|70794,Filderstadt,BW|70806,Kornwestheim,BW|70825,Korntal-Münchingen,BW|70839,Gerlingen,BW|71032,Böblingen,BW|71034,Böblingen,BW|71063,Sindelfingen,BW|71065,Sindelfingen,BW|71067,Sindelfingen,BW|71069,Sindelfingen,BW|71083,Herrenberg,BW|71088,Holzgerlingen,BW|71093,Weil im Schönbuch,BW|71101,Schönaich,BW|71106,Magstadt,BW|71111,Burkhardtsmühle,BW|71116,Gärtringen,BW|71120,Grafenau,BW|71126,Gäufelden,BW|71131,Jettingen,BW|71134,Aidlingen,BW|71139,Ehningen,BW|71144,Schlechtenmühle,BW|71149,Bondorf,BW|71154,Nufringen,BW|71155,Altdorf,BW|71157,Hildrizhausen,BW|71159,Mötzingen,BW|71229,Leonberg,BW|71254,Ditzingen,BW|71263,Weil der Stadt,BW|71272,Grundhof,BW|71277,Rutesheim,BW|71282,Hemmingen,BW|71287,Weissach,BW|71292,Friolzheim,BW|71296,Heimsheim,BW|71297,Mönsheim,BW|71299,Wimsheim,BW|71332,Waiblingen,BW|71334,Waiblingen,BW|71336,Waiblingen,BW|71364,Birkachhof,BW|71384,Weinstadt,BW|71394,Kernen,BW|71397,Leutenbach,BW|71404,Korb,BW|71409,Schwaikheim,BW|71522,Backnang,BW|71540,Glattenzainbach,BW|71543,Stocksberg, Gem Beilstein,BW|71546,Aspach,BW|71549,Auenwald,BW|71554,Weissach,BW|71560,Bernhalden,BW|71563,Affalterbach,BW|71566,Althütte,BW|71570,Katharinenhof,BW|71573,Allmersbach,BW|71576,Burgstetten,BW|71577,Großerlach,BW|71579,Spiegelberg,BW|71634,Ludwigsburg,BW|71636,Ludwigsburg,BW|71638,Ludwigsburg,BW|71640,Ludwigsburg,BW|71642,Ludwigsburg,BW|71665,Vaihingen,BW|71672,Makenhof,BW|71679,Asperg,BW|71686,Remseck,BW|71691,Freiberg,BW|71696,Möglingen,BW|71701,Schwieberdingen,BW|71706,Hardthof,BW|71711,Hinterbirkenhof,BW|71717,Beilstein,BW|71720,Obere Ölmühle,BW|71723,Großbottwar,BW|71726,Benningen,BW|71729,Erdmannhausen,BW|71732,Lehenfeld,BW|71735,Eberdingen,BW|71737,Kirchberg,BW|71739,Oberriexingen,BW|72070,Hohenentringen,BW|72072,Tübingen,BW|72074,Tübingen,BW|72076,Tübingen,BW|72108,Rottenburg,BW|72116,Mössingen,BW|72119,Ammerbuch,BW|72124,Pliezhausen,BW|72127,Kusterdingen,BW|72131,Ofterdingen,BW|72135,Dettenhausen,BW|72138,Im Hengstrain,BW|72141,Walddorfhäslach,BW|72144,Dußlingen,BW|72145,Hirrlingen,BW|72147,Nehren,BW|72149,Neustetten,BW|72160,Horb,BW|72172,Sulz,BW|72175,Dornhan,BW|72178,Waldachtal,BW|72181,Starzach,BW|72184,Eutingen,BW|72186,Empfingen,BW|72189,Vöhringen,BW|72202,Nagold,BW|72213,Altensteig,BW|72218,Wildberg,BW|72221,Haiterbach,BW|72224,Ebhausen,BW|72226,Simmersfeld,BW|72227,Egenhausen,BW|72229,Rohrdorf,BW|72250,Freudenstadt,BW|72270,Baiersbronn,BW|72275,Alpirsbach,BW|72280,Dornstetten,BW|72285,Pfalzgrafenweiler,BW|72290,Loßburg,BW|72291,Betzweiler-Wälde,BW|72293,Glatten,BW|72294,Grömbach,BW|72296,Schopfloch,BW|72297,Pfaffenstube,BW|72299,Wörnersberg,BW|72336,Balingen,BW|72348,Rosenfeld,BW|72351,Geislingen,BW|72355,Schömberg,BW|72356,Dautmergen,BW|72358,Dormettingen,BW|72359,Dotternhausen,BW|72361,Hausen,BW|72362,Nusplingen,BW|72364,Obernheim,BW|72365,Ratshausen,BW|72367,Weilen,BW|72369,Zimmern,BW|72379,Burg Hohenzollern,BW|72393,Burladingen,BW|72401,Haigerloch,BW|72406,Bisingen,BW|72411,Bodelshausen,BW|72414,Rangendingen,BW|72415,Grosselfingen,BW|72417,Jungingen,BW|72419,Lieshöfe,BW|72458,Albstadt,BW|72459,Albstadt,BW|72461,Albstadt,BW|72469,Meßstetten,BW|72474,Winterlingen,BW|72475,Bitz,BW|72477,Schwenningen,BW|72479,Straßberg,BW|72488,Sigmaringen,BW|72501,Gammertingen,BW|72505,Krauchenwies,BW|72510,Stetten,BW|72511,Bingen,BW|72513,Hettingen,BW|72514,Inzigkofen,BW|72516,Scheer,BW|72517,Sigmaringendorf,BW|72519,Veringenstadt,BW|72525,Gutsbezirk Münsingen,BW|72531,Hohenstein,BW|72532,Gomadingen,BW|72534,Hayingen,BW|72535,Heroldstatt,BW|72537,Mehrstetten,BW|72539,Pfronstetten,BW|72555,Metzingen,BW|72574,Bad Urach,BW|72581,Dettingen,BW|72582,Grabenstetten,BW|72584,Hülben,BW|72585,Riederich,BW|72587,Römerstein,BW|72589,Westerheim,BW|72622,Nürtingen,BW|72631,Aichtal,BW|72636,Frickenhausen,BW|72639,Neuffen,BW|72644,Oberboihingen,BW|72649,Wolfschlugen,BW|72654,Neckartenzlingen,BW|72655,Altdorf,BW|72657,Altenriet,BW|72658,Bempflingen,BW|72660,Beuren,BW|72661,Grafenberg,BW|72663,Großbettlingen,BW|72664,Kohlberg,BW|72666,Neckartailfingen,BW|72667,Schlaitdorf,BW|72669,Unterensingen,BW|72760,Reutlingen,BW|72762,Reutlingen,BW|72764,Reutlingen,BW|72766,Reutlingen,BW|72768,Reutlingen,BW|72770,Reutlingen,BW|72793,Pfullingen,BW|72800,Eningen,BW|72805,Lichtenstein,BW|72810,Gomaringen,BW|72813,Oberer Lindenhof,BW|72818,Trochtelfingen,BW|72820,Sonnenbühl,BW|72827,Wannweil,BW|72829,Engstingen,BW|73033,Göppingen,BW|73035,Göppingen,BW|73037,Eitleshof,BW|73054,Eislingen,BW|73061,Ebersbach,BW|73066,Uhingen,BW|73072,Donzdorf,BW|73079,Baierhof,BW|73084,Salach,BW|73087,Boll,BW|73092,Heiningen,BW|73095,Albershausen,BW|73098,Rechberghausen,BW|73099,Adelberg,BW|73101,Aichelberg,BW|73102,Birenbach,BW|73104,Börtlingen,BW|73105,Dürnau,BW|73107,Eschenbach,BW|73108,Gammelshausen,BW|73110,Hattenhofen,BW|73111,Lauterstein,BW|73113,Oberer Etzberg,BW|73114,Schlat,BW|73116,Krettenhof,BW|73117,Wangen,BW|73119,Zell,BW|73207,Plochingen,BW|73230,Kirchheim,BW|73235,Kaltenwanghof,BW|73240,Wendlingen,BW|73249,Berghof,BW|73252,Lenningen,BW|73257,Köngen,BW|73262,Reichenbach,BW|73265,Dettingen,BW|73266,Bissingen,BW|73268,Erkenbrechtsweiler,BW|73269,Hochdorf,BW|73271,Holzmaden,BW|73272,Neidlingen,BW|73274,Notzingen,BW|73275,Ohmden,BW|73277,Owen,BW|73312,Berneck,BW|73326,Deggingen,BW|73329,Kuchen,BW|73333,Gingen,BW|73337,Bad Überkingen,BW|73340,Amstetten,BW|73342,Bad Ditzenbach,BW|73344,Gruibingen,BW|73345,Drackenstein,BW|73347,Mühlhausen,BW|73349,Eselhöfe,BW|73430,Aalen,BW|73431,Aalen,BW|73432,Aalen,BW|73433,Aalen,BW|73434,Aalen,BW|73441,Bopfingen,BW|73447,Oberkochen,BW|73450,Hochstatter Hof,BW|73453,Abtsgmünd,BW|73457,Essingen,BW|73460,Hüttlingen,BW|73463,Westhausen,BW|73466,Lauchheim,BW|73467,Kirchheim,BW|73469,Riesbürg,BW|73479,Adlersteige,BW|73485,Ellrichsbronn,BW|73486,Adelmannsfelden,BW|73488,Ellenberg,BW|73489,Grunbachsägmühle,BW|73491,Neuler,BW|73492,Rainau,BW|73494,Belzhof,BW|73495,Stödtlen,BW|73497,Tannhausen,BW|73499,Wört,BW|73525,Schwäbisch Gmünd,BW|73527,Schwäbisch Gmünd,BW|73529,Bärenhof,BW|73540,Heubach,BW|73547,Beutenmühle,BW|73550,Hummelshalden,BW|73553,Alfdorf,BW|73557,Mutlangen,BW|73560,Böbingen,BW|73563,Mögglingen,BW|73565,Mooswiese,BW|73566,Bartholomä,BW|73568,Durlangen,BW|73569,Bräunlesrain,BW|73571,Göggingen,BW|73572,Heuchlingen,BW|73574,Iggingen,BW|73575,Horn,BW|73577,Buchhof,BW|73579,Schechingen,BW|73614,Schorndorf,BW|73630,Remshalden,BW|73635,Obersteinenberg,BW|73642,Eibenhof,BW|73650,Winterbach,BW|73655,Bärenbach,BW|73660,Urbach,BW|73663,Berglen,BW|73666,Baltmannsweiler,BW|73667,Ebnisee,BW|73669,Lichtenwald,BW|73728,Esslingen,BW|73730,Esslingen,BW|73732,Esslingen,BW|73733,Esslingen,BW|73734,Esslingen,BW|73760,Ostfildern,BW|73765,Neuhausen,BW|73770,Denkendorf,BW|73773,Aichwald,BW|73776,Altbach,BW|73779,Deizisau,BW|74072,Heilbronn,BW|74074,Heilbronn,BW|74076,Heilbronn,BW|74078,Heilbronn,BW|74080,Heilbronn,BW|74081,Heilbronn,BW|74172,Neckarsulm,BW|74177,Bad Friedrichshall,BW|74182,Obersulm,BW|74189,Weinsberg,BW|74193,Schwaigern,BW|74196,Grollenhof,BW|74199,Untergruppenbach,BW|74206,Bad Wimpfen,BW|74211,Leingarten,BW|74214,Schöntal,BW|74219,Möckmühl,BW|74223,Flein,BW|74226,Nordheim,BW|74229,Oedheim,BW|74232,Abstatt,BW|74235,Erlenbach,BW|74238,Krautheim,BW|74239,Hardthausen,BW|74243,Langenbrettach,BW|74245,Löwenstein,BW|74246,Eberstadt,BW|74248,Ellhofen,BW|74249,Buchhof, Gem Hardthausen,BW|74251,Lehrensteinsfeld,BW|74252,Massenbachhausen,BW|74254,Offenau,BW|74255,Roigheim,BW|74257,Untereisesheim,BW|74259,Widdern,BW|74321,Bietigheim-Bissingen,BW|74336,Brackenheim,BW|74343,Sachsenheim,BW|74348,Lauffen,BW|74354,Besigheim,BW|74357,Bellevue,BW|74360,Ilsfeld,BW|74363,Güglingen,BW|74366,Kirchheim,BW|74369,Löchgau,BW|74372,Sersheim,BW|74374,Zaberfeld,BW|74376,Gemmrigheim,BW|74379,Ingersheim,BW|74382,Neckarwestheim,BW|74385,Pleidelsheim,BW|74388,Talheim,BW|74389,Cleebronn,BW|74391,Erligheim,BW|74392,Freudental,BW|74394,Hessigheim,BW|74395,Mundelsheim,BW|74397,Pfaffenhofen,BW|74399,Walheim,BW|74405,Gaildorf,BW|74417,Gschwend,BW|74420,Oberrot,BW|74423,Obersontheim,BW|74424,Bühlertann,BW|74426,Bühlerzell,BW|74427,Fichtenberg,BW|74429,Sulzbach-Laufen,BW|74523,Bühlerzimmern,BW|74532,Buch,BW|74535,Mainhardt,BW|74538,Rosengarten,BW|74541,Vellberg,BW|74542,Braunsbach,BW|74544,Michelbach an der Bilz,BW|74545,Hinterziegelhalden,BW|74547,Untermünkheim,BW|74549,Wolpertshausen,BW|74564,Auhof,BW|74572,Blaufelden,BW|74575,Schrozberg,BW|74579,Buchmühle,BW|74582,Gerabronn,BW|74585,Horschhof,BW|74586,Frankenhardt,BW|74589,Satteldorf,BW|74592,Kirchberg,BW|74594,Gumpenweiler,BY|74595,Langenburg,BW|74597,Appensee,BW|74599,Wallhausen,BW|74613,Öhringen,BW|74626,Bretzfeld,BW|74629,Pfedelbach,BW|74632,Haberhof,BW|74635,Kupferzell,BW|74638,Waldenburg,BW|74639,Schießhof,BW|74653,Ingelfingen,BW|74670,Forchtenberg,BW|74673,Mulfingen,BW|74676,Niedernhall,BW|74677,Dörzbach,BW|74679,Weißbach,BW|74706,Osterburken,BW|74722,Buchen,BW|74731,Storchhof,BW|74736,Hardheim,BW|74740,Adelsheim,BW|74743,Seckach,BW|74744,Ahorn,BW|74746,Höpfingen,BW|74747,Ravenstein,BW|74749,Rosenberg,BW|74821,Mosbach,BW|74831,Gundelsheim,BW|74834,Elztal,BW|74838,Limbach,BW|74842,Billigheim,BW|74847,Obrigheim,BW|74850,Schefflenz,BW|74855,Haßmersheim,BW|74858,Aglasterhausen,BW|74861,Neudenau,BW|74862,Binau,BW|74864,Fahrenbach,BW|74865,Neckarzimmern,BW|74867,Neunkirchen,BW|74869,Schwarzach,BW|74889,Sinsheim,BW|74906,Bad Rappenau,BW|74909,Meckesheim,BW|74912,Kirchardt,BW|74915,Waibstadt,BW|74918,Angelbachtal,BW|74921,Helmstadt-Bargen,BW|74924,Neckarbischofsheim,BW|74925,Epfenbach,BW|74927,Eschelbronn,BW|74928,Hüffenhardt,BW|74930,Ittlingen,BW|74931,Lobbach,BW|74933,Neidenstein,BW|74934,Reichartshausen,BW|74936,Siegelsbach,BW|74937,Spechbach,BW|74939,Zuzenhausen,BW|75015,Bretten,BW|75031,Eppingen,BW|75038,Oberderdingen,BW|75045,Walzbachtal,BW|75050,Gemmingen,BW|75053,Gondelsheim,BW|75056,Sulzfeld,BW|75057,Kürnbach,BW|75059,Egonmühle,BW|75172,Pforzheim,BW|75173,Pforzheim,BW|75175,Pforzheim,BW|75177,Katharinenthalerhof,BW|75179,Pforzheim,BW|75180,Pforzheim,BW|75181,Pforzheim,BW|75196,Remchingen,BW|75203,Königsbach-Stein,BW|75210,Keltern,BW|75217,Birkenfeld,BW|75223,Niefern-Öschelbronn,BW|75228,Ispringen,BW|75233,Tiefenbronn,BW|75236,Kämpfelbach,BW|75239,Eisingen,BW|75242,Neuhausen,BW|75245,Neulingen,BW|75248,Ölbronn-Dürrn,BW|75249,Kieselbronn,BW|75305,Neuenbürg,BW|75323,Bad Wildbad,BW|75328,Schömberg,BW|75331,Engelsbrand,BW|75334,Straubenhardt,BW|75335,Dobel,BW|75337,Enzklösterle,BW|75339,Höfen,BW|75365,Calw,BW|75378,Bad Liebenzell,BW|75382,Althengstett,BW|75385,Bad Teinach-Zavelstein,BW|75387,Neubulach,BW|75389,Neuweiler,BW|75391,Gechingen,BW|75392,Deckenpfronn,BW|75394,Oberreichenbach,BW|75395,Ostelsheim,BW|75397,Simmozheim,BW|75399,Nagoldtal,BW|75417,Mühlacker,BW|75428,Illingen,BW|75433,Maulbronn,BW|75438,Knittlingen,BW|75443,Ötisheim,BW|75446,Wiernsheim,BW|75447,Sternenfels,BW|75449,Wurmberg,BW|76131,Karlsruhe,BW|76133,Karlsruhe,BW|76135,Karlsruhe,BW|76137,Karlsruhe,BW|76139,Karlsruhe,BW|76149,Karlsruhe,BW|76185,Karlsruhe,BW|76187,Karlsruhe,BW|76189,Karlsruhe,BW|76199,Karlsruhe,BW|76227,Karlsruhe,BW|76228,Karlsruhe,BW|76229,Karlsruhe,BW|76275,Ettlingen,BW|76287,Rheinstetten,BW|76297,Stutensee,BW|76307,Karlsbad,BW|76316,Malsch,BW|76327,Pfinztal,BW|76332,Bad Herrenalb,BW|76337,Waldbronn,BW|76344,Eggenstein-Leopoldshafen,BW|76351,Linkenheim-Hochstetten,BW|76356,Weingarten,BW|76359,Fischweier,BW|76437,Rastatt,BW|76448,Durmersheim,BW|76456,Kuppenheim,BW|76461,Muggensturm,BW|76467,Bietigheim,BW|76470,Ötigheim,BW|76473,Iffezheim,BW|76474,Au,BW|76476,Bischweier,BW|76477,Elchesheim-Illingen,BW|76479,Steinmauern,BW|76530,Baden-Baden,BW|76532,Baden-Baden,BW|76534,Baden-Baden,BW|76547,Sinzheim,BW|76549,Hügelsheim,BW|76571,Gaggenau,BW|76593,Gernsbach,BW|76596,Forbach,BW|76597,Loffenau,BW|76599,Weisenbach,BW|76646,Bruchsal,BW|76661,Philippsburg,BW|76669,Bad Schönborn,BW|76676,Graben-Neudorf,BW|76684,Östringen,BW|76689,Karlsdorf-Neuthard,BW|76694,Fasanenhof,BW|76698,Ubstadt-Weiher,BW|76703,Kraichtal,BW|76706,Dettenheim,BW|76707,Hambrücken,BW|76709,Kronau,BW|76726,Altbrand,RP|76744,Höllenmühle,RP|76751,Jockgrim,RP|76756,Bellheim,RP|76761,Rülzheim,RP|76764,Rheinzabern,RP|76767,Hagenbach,RP|76768,Berg,RP|76770,Hatzenbühl,RP|76771,Hördt,RP|76773,Kuhardt,RP|76774,Leimersheim,RP|76776,Neuburg,RP|76777,Neupotz,RP|76779,Salmbacher Passage,RP|76829,Landau,RP|76831,Billigheim-Ingenheim,RP|76833,Böchingen,RP|76835,Burrweiler,RP|76846,Hauenstein,RP|76848,Darstein,RP|76855,Annweiler,RP|76857,Albersweiler,RP|76863,Herxheim,RP|76865,Insheim,RP|76870,Kandel,RP|76872,Bruchsiedlung,RP|76877,Fuchsmühle,RP|76879,Bornheim,RP|76887,Bad Bergzabern,RP|76889,Am Springberg,RP|76891,Bobenthal,RP|77652,Offenburg,BW|77654,Offenburg,BW|77656,Offenburg,BW|77694,Kehl,BW|77704,Oberkirch,BW|77709,Oberwolfach,BW|77716,Fischerbach,BW|77723,Gengenbach,BW|77728,Oppenau,BW|77731,Willstätt,BW|77736,Zell,BW|77740,Bad Peterstal-Griesbach,BW|77743,Neuried,BW|77746,Schutterwald,BW|77749,Hohberg,BW|77756,Hausach,BW|77761,Schiltach,BW|77767,Appenweier,BW|77770,Durbach,BW|77773,Schenkenzell,BW|77776,Bad Rippoldsau-Schapbach,BW|77781,Biberach,BW|77784,Oberharmersbach,BW|77787,Nordrach,BW|77790,Steinach,BW|77791,Berghaupten,BW|77793,Gutach,BW|77794,Lautenbach,BW|77796,Mühlenbach,BW|77797,Ohlsbach,BW|77799,Ortenberg,BW|77815,Bühl,BW|77830,Bühlertal,BW|77833,Ottersweier,BW|77836,Rheinmünster,BW|77839,Lichtenau,BW|77855,Achern,BW|77866,Rheinau,BW|77871,Renchen,BW|77876,Kappelrodeck,BW|77880,Sasbach,BW|77883,Ottenhöfen,BW|77886,Lauf,BW|77887,Sasbachwalden,BW|77889,Seebach,BW|77933,Lahr,BW|77948,Friesenheim,BW|77955,Ettenheim,BW|77960,Seelbach,BW|77963,Schwanau,BW|77966,Kappel-Grafenhausen,BW|77971,Kippenheim,BW|77972,Mahlberg,BW|77974,Meißenheim,BW|77975,Ringsheim,BW|77977,Rust,BW|77978,Schuttertal,BW|78048,Villingen-Schwenningen,BW|78050,Villingen-Schwenningen,BW|78052,Villingen-Schwenningen,BW|78054,Villingen-Schwenningen,BW|78056,Villingen-Schwenningen,BW|78073,Bad Dürrheim,BW|78078,Niedereschach,BW|78083,Dauchingen,BW|78086,Brigachtal,BW|78087,Mönchweiler,BW|78089,Unterkirnach,BW|78098,Triberg,BW|78112,Schoren,BW|78120,Furtwangen,BW|78126,Königsfeld,BW|78132,Hornberg,BW|78136,Schonach,BW|78141,Schönwald,BW|78144,Tennenbronn,BW|78147,Vöhrenbach,BW|78148,Gütenbach,BW|78166,Donaueschingen,BW|78176,Blumberg,BW|78183,Hüfingen,BW|78187,Geisingen,BW|78194,Immendingen,BW|78199,Bräunlingen,BW|78224,Singen,BW|78234,Engen,BW|78239,Rielasingen-Worblingen,BW|78244,Gottmadingen,BW|78247,Hilzingen,BW|78250,Tengen,BW|78253,Eigeltingen,BW|78256,Steißlingen,BW|78259,Mühlhausen-Ehingen,BW|78262,Gailingen,BW|78266,Büsingen,BW|78267,Aach,BW|78269,Volkertshausen,BW|78315,Radolfzell,BW|78333,Stockach,BW|78337,Öhningen,BW|78343,Gaienhofen,BW|78345,Moos,BW|78351,Bodman-Ludwigshafen,BW|78354,Sipplingen,BW|78355,Hohenfels,BW|78357,Mühlingen,BW|78359,Orsingen-Nenzingen,BW|78462,Konstanz,BW|78464,Konstanz,BW|78465,Insel Mainau,BW|78467,Konstanz,BW|78476,Allensbach,BW|78479,Reichenau,BW|78532,Tuttlingen,BW|78549,Spaichingen,BW|78554,Aldingen,BW|78559,Gosheim,BW|78564,Reichenbach,BW|78567,Fridingen,BW|78570,Mühlheim,BW|78573,Wurmlingen,BW|78576,Emmingen-Liptingen,BW|78579,Neuhausen,BW|78580,Bärenthal,BW|78582,Balgheim,BW|78583,Böttingen,BW|78585,Bubsheim,BW|78586,Deilingen,BW|78588,Denkingen,BW|78589,Dürbheim,BW|78591,Durchhausen,BW|78592,Egesheim,BW|78594,Gunningen,BW|78595,Hausen,BW|78597,Irndorf,BW|78598,Königsheim,BW|78600,Kolbingen,BW|78601,Mahlstetten,BW|78603,Renquishausen,BW|78604,Rietheim-Weilheim,BW|78606,Seitingen-Oberflacht,BW|78607,Talheim,BW|78609,Tuningen,BW|78628,Hochhalden,BW|78647,Trossingen,BW|78652,Deißlingen,BW|78655,Dunningen,BW|78658,Zimmern,BW|78661,Dietingen,BW|78662,Bösingen,BW|78664,Eschbronn,BW|78665,Frittlingen,BW|78667,Hochwald,BW|78669,Wellendingen,BW|78713,Gifizenmoos,BW|78727,Oberndorf,BW|78730,Lauterbach,BW|78733,Aichhalden,BW|78736,Epfendorf,BW|78737,Fluorn-Winzeln,BW|78739,Hardt,BW|79098,Freiburg,BW|79100,Freiburg,BW|79102,Freiburg,BW|79104,Freiburg,BW|79106,Freiburg,BW|79108,Freiburg,BW|79110,Freiburg,BW|79111,Freiburg,BW|79112,Freiburg,BW|79114,Freiburg,BW|79115,Freiburg,BW|79117,Freiburg,BW|79183,Waldkirch,BW|79189,Bad Krozingen,BW|79194,Gundelfingen,BW|79199,Kirchzarten,BW|79206,Breisach,BW|79211,Denzlingen,BW|79215,Biederbach,BW|79219,Staufen,BW|79224,Umkirch,BW|79227,Schallstadt,BW|79232,March,BW|79235,Vogtsburg,BW|79238,Ehrenkirchen,BW|79241,Ihringen,BW|79244,Münstertal,BW|79249,Merzhausen,BW|79252,Stegen,BW|79254,Oberried,BW|79256,Buchenbach,BW|79258,Hartheim,BW|79261,Gutach,BW|79263,Simonswald,BW|79268,Bötzingen,BW|79271,St. Peter,BW|79274,St. Märgen,BW|79276,Reute,BW|79279,Vörstetten,BW|79280,Au,BW|79282,Ballrechten-Dottingen,BW|79283,Bollschweil,BW|79285,Ebringen,BW|79286,Glottertal,BW|79288,Gottenheim,BW|79289,Horben,BW|79291,Merdingen,BW|79292,Pfaffenweiler,BW|79294,Sölden,BW|79295,Sulzburg,BW|79297,Winden,BW|79299,Wittnau,BW|79312,Emmendingen,BW|79331,Teningen,BW|79336,Herbolzheim,BW|79341,Kenzingen,BW|79346,Endingen,BW|79348,Freiamt,BW|79350,Sexau,BW|79353,Bahlingen,BW|79356,Eichstetten,BW|79359,Riegel,BW|79361,Sasbach,BW|79362,Forchheim,BW|79364,Malterdingen,BW|79365,Rheinhausen,BW|79367,Weisweil,BW|79369,Wyhl,BW|79379,Müllheim,BW|79395,Neuenburg,BW|79400,Kandern,BW|79410,Badenweiler,BW|79415,Bad Bellingen,BW|79418,Schliengen,BW|79423,Heitersheim,BW|79424,Auggen,BW|79426,Buggingen,BW|79427,Eschbach,BW|79429,Malsburg-Marzell,BW|79539,Lörrach,BW|79540,Lörrach,BW|79541,Lörrach,BW|79576,Weil am Rhein,BW|79585,Steinen,BW|79588,Efringen-Kirchen,BW|79589,Binzen,BW|79591,Eimeldingen,BW|79592,Fischingen,BW|79594,Inzlingen,BW|79595,Rümmingen,BW|79597,Schallbach,BW|79599,Wittlingen,BW|79618,Rheinfelden,BW|79639,Grenzach-Wyhlen,BW|79650,Schopfheim,BW|79664,Wehr,BW|79669,Zell,BW|79674,Todtnau,BW|79677,Aitern,BW|79682,Todtmoos,BW|79683,Bürchau,BW|79685,Häg-Ehrsberg,BW|79686,Hasel,BW|79688,Hausen,BW|79689,Maulburg,BW|79691,Neuenweg,BW|79692,Elbenschwand,BW|79694,Utzenfeld,BW|79695,Wieden,BW|79697,Wies,BW|79699,Wieslet,BW|79713,Bad Säckingen,BW|79725,Laufenburg,BW|79730,Murg,BW|79733,Görwihl,BW|79736,Rickenbach,BW|79737,Herrischried,BW|79739,Schwörstadt,BW|79761,Waldshut-Tiengen,BW|79771,Klettgau,BW|79774,Albbruck,BW|79777,Ühlingen-Birkendorf,BW|79780,Stühlingen,BW|79787,Lauchringen,BW|79790,Küssaberg,BW|79793,Wutöschingen,BW|79798,Jestetten,BW|79801,Hohentengen,BW|79802,Dettighofen,BW|79804,Dogern,BW|79805,Eggingen,BW|79807,Lottstetten,BW|79809,Weilheim,BW|79822,Titisee-Neustadt,BW|79837,Häusern,BW|79843,Löffingen,BW|79848,Bonndorf,BW|79853,Lenzkirch,BW|79856,Hinterzarten,BW|79859,Schluchsee,BW|79862,Höchenschwand,BW|79865,Grafenhausen,BW|79868,Feldberg,BW|79871,Eisenbach,BW|79872,Bernau,BW|79874,Breitnau,BW|79875,Dachsberg,BW|79877,Friedenweiler,BW|79879,Wutach,BW|80331,München,BY|80333,München,BY|80335,München,BY|80336,München,BY|80337,München,BY|80339,München,BY|80469,München,BY|80538,München,BY|80539,München,BY|80634,München,BY|80636,München,BY|80637,München,BY|80638,München,BY|80639,München,BY|80686,München,BY|80687,München,BY|80689,München,BY|80796,München,BY|80797,München,BY|80798,München,BY|80799,München,BY|80801,München,BY|80802,München,BY|80803,München,BY|80804,München,BY|80805,München,BY|80807,München,BY|80809,München,BY|80933,München,BY|80935,München,BY|80937,München,BY|80939,München,BY|80992,München,BY|80993,München,BY|80995,München,BY|80997,München,BY|80999,München,BY|81241,München,BY|81243,München,BY|81245,München,BY|81247,München,BY|81249,München,BY|81369,München,BY|81371,München,BY|81373,München,BY|81375,München,BY|81377,München,BY|81379,München,BY|81475,München,BY|81476,München,BY|81477,München,BY|81479,München,BY|81539,München,BY|81541,München,BY|81543,München,BY|81545,München,BY|81547,München,BY|81549,München,BY|81667,München,BY|81669,München,BY|81671,München,BY|81673,München,BY|81675,München,BY|81677,München,BY|81679,München,BY|81735,München,BY|81737,München,BY|81739,München,BY|81825,München,BY|81827,München,BY|81829,München,BY|81925,München,BY|81927,München,BY|81929,München,BY|82008,Unterhaching,BY|82024,Taufkirchen,BY|82031,Grünwald,BY|82041,Deisenhofen,BY|82049,Großhesselohe,BY|82054,Sauerlach,BY|82057,Icking,BY|82061,Neuried,BY|82064,Jettenhausen,BY|82065,Baierbrunn,BY|82067,Ebenhausen,BY|82069,Hohenschäftlarn,BY|82110,Germering,BY|82131,Gauting,BY|82140,Olching,BY|82152,Krailling,BY|82166,Gräfelfing,BY|82178,Puchheim,BY|82194,Gröbenzell,BY|82205,Gilching,BY|82211,Herrsching,BY|82216,Frauenberg,BY|82223,Eichenau,BY|82229,Seefeld,BY|82234,Weßling,BY|82237,Wörthsee,BY|82239,Alling,BY|82256,Fürstenfeldbruck,BY|82266,Inning,BY|82269,Geltendorf,BY|82272,Moorenweis,BY|82275,Emmering,BY|82276,Adelshofen,BY|82278,Althegnenberg,BY|82279,Eching,BY|82281,Egenhofen,BY|82282,Aufkirchen,BY|82284,Grafrath,BY|82285,Hattenhofen,BY|82287,Jesenwang,BY|82288,Kottgeisering,BY|82290,Landsberied,BY|82291,Mammendorf,BY|82293,Mittelstetten,BY|82294,Oberschweinbach,BY|82296,Schöngeising,BY|82297,Steindorf,BY|82299,Türkenfeld,BY|82319,Seewiesen,BY|82327,Tutzing,BY|82335,Berg,BY|82340,Feldafing,BY|82343,Pöcking,BY|82346,Andechs,BY|82347,Bernried,BY|82349,Frohnloh,BY|82362,Schörghof,BY|82377,Penzberg,BY|82380,Bruckerhof,BY|82383,Hohenpeißenberg,BY|82386,Huglfing,BY|82387,Antdorf,BY|82389,Böbing,BY|82390,Eberfing,BY|82392,Habach,BY|82393,Iffeldorf,BY|82395,Obersöchering,BY|82396,Pähl,BY|82398,Polling,BY|82399,Raisting,BY|82401,Rottenbuch,BY|82402,Seeshaupt,BY|82404,Sindelsdorf,BY|82405,Wessobrunn,BY|82407,Wielenbach,BY|82409,Wildsteig,BY|82418,Hofheim,BY|82431,Kochel,BY|82432,Herzogstand,BY|82433,Bad Kohlgrub,BY|82435,Bad Bayersoien,BY|82436,Eglfing,BY|82438,Eschenlohe,BY|82439,Großweil,BY|82441,Ohlstadt,BY|82442,Saulgrub,BY|82444,Schlehdorf,BY|82445,Schwaigen,BY|82447,Spatzenhausen,BY|82449,Heimgarten,BY|82467,Garmisch-Partenkirchen,BY|82475,Schneefernerhaus,BY|82481,Mittenwald,BY|82487,Oberammergau,BY|82488,Ettal,BY|82490,Farchant,BY|82491,Grainau,BY|82493,Am Quicken,BY|82494,Krün,BY|82496,Oberau,BY|82497,Unterammergau,BY|82499,Wallgau,BY|82515,Bruckmaier,BY|82538,Geretsried,BY|82541,Münsing,BY|82544,Egling,BY|82547,Eurasburg,BY|82549,Königsdorf,BY|83022,Rosenheim,BY|83024,Rosenheim,BY|83026,Rosenheim,BY|83043,Bad Aibling,BY|83052,Bruckmühl,BY|83059,Kolbermoor,BY|83064,Raubling,BY|83071,Stephanskirchen,BY|83075,Bad Feilnbach,BY|83080,Oberaudorf,BY|83083,Riedering,BY|83088,Kiefersfelden,BY|83093,Bad Endorf,BY|83098,Brannenburg,BY|83101,Rohrdorf,BY|83104,Tuntenhausen,BY|83109,Großkarolinenfeld,BY|83112,Frasdorf,BY|83115,Neubeuern,BY|83119,Eggerdach,BY|83122,Samerberg,BY|83123,Amerang,BY|83125,Eggstätt,BY|83126,Flintsbach,BY|83128,Halfing,BY|83129,Höslwang,BY|83131,Nußdorf,BY|83132,Pittenhart,BY|83134,Prutting,BY|83135,Schechen,BY|83137,Schonstett,BY|83139,Söchtenau,BY|83209,Herrenchiemsee,BY|83224,Grassau,BY|83229,Aschau,BY|83233,Bernau,BY|83236,Übersee,BY|83242,Reit im Winkl,BY|83246,Unterwössen,BY|83250,Fahrnpoint,BY|83253,Rimsting,BY|83254,Breitbrunn,BY|83256,Chiemsee,BY|83257,Gstadt,BY|83259,Schleching,BY|83278,Traunstein,BY|83301,Traunreut,BY|83308,Trostberg,BY|83313,Grub,BY|83317,Teisendorf,BY|83324,Ruhpolding,BY|83329,Aichberg,BY|83334,Inzell,BY|83339,Chieming,BY|83342,Tacherting,BY|83346,Bergen,BY|83349,Palling,BY|83352,Altenmarkt,BY|83355,Grabenstätt,BY|83358,Grafenanger,BY|83359,Ettendorf,BY|83361,Kienberg,BY|83362,Berg,BY|83364,Adligstadt,BY|83365,Nußdorf,BY|83367,Ebing,BY|83368,Anning,BY|83370,Seeon,BY|83371,Buchberg,BY|83373,Taching,BY|83374,Arleting,BY|83376,Apperting,BY|83377,Lug,BY|83379,Egerdach,BY|83395,Freilassing,BY|83404,Ainring,BY|83410,Laufen,BY|83413,Fridolfing,BY|83417,Kirchanschöring,BY|83435,Bad Reichenhall,BY|83451,Piding,BY|83454,Anger,BY|83457,Bayerisch Gmain,BY|83458,Schneizlreuth,BY|83471,Berchtesgaden,BY|83483,Bischofswiesen,BY|83486,Blaueishütte,BY|83487,Marktschellenberg,BY|83489,Strub,BY|83512,Langwiederberg,BY|83527,Haag,BY|83530,Schnaitsee,BY|83533,Edling,BY|83536,Gars,BY|83539,Pfaffing,BY|83543,Rott,BY|83544,Albaching,BY|83546,Au,BY|83547,Babensham,BY|83549,Eiselfing,BY|83550,Emmering,BY|83552,Achen,BY|83553,Frauenneuharting,BY|83555,Gars Bahnhof,BY|83556,Griesstätt,BY|83558,Maitenbeth,BY|83559,Heuwinkl,BY|83561,Ramerberg,BY|83562,Rechtmehring,BY|83564,Soyen,BY|83565,Aichat,BY|83567,Unterreit,BY|83569,Vogtareuth,BY|83607,Holzkirchen,BY|83620,Feldkirchen-Westerham,BY|83623,Dietramszell,BY|83624,Otterfing,BY|83626,Grabenstoffl,BY|83627,Warngau,BY|83629,Weyarn,BY|83646,Bad Tölz,BY|83661,Lenggries,BY|83666,Waakirchen,BY|83670,Bad Heilbrunn,BY|83671,Benediktbeuern,BY|83673,Bichl,BY|83674,Gaißach,BY|83676,Jachenau,BY|83677,Greiling,BY|83679,Sachsenkam,BY|83684,Tegernsee,BY|83700,Oberhof,BY|83703,Gmund,BY|83707,Bad Wiessee,BY|83708,Kreuth,BY|83714,Fußstall,BY|83727,Rotwandhaus,BY|83730,Fischbachau,BY|83734,Hausham,BY|83735,Bayrischzell,BY|83737,Irschenberg,BY|83739,Ahrain,BY|84028,Landshut,BY|84030,Ergolding,BY|84032,Altdorf,BY|84034,Landshut,BY|84036,Kumhausen,BY|84048,Mainburg,BY|84051,Essenbach,BY|84056,Rottenburg,BY|84061,Ergoldsbach,BY|84066,Mallersdorf-Pfaffenberg,BY|84069,Schierling,BY|84072,Au,BY|84076,Pfeffenhausen,BY|84079,Bruckberg,BY|84082,Laberweinting,BY|84085,Langquaid,BY|84088,Neufahrn,BY|84089,Aiglsbach,BY|84091,Attenhofen,BY|84092,Bayerbach,BY|84094,Elsendorf,BY|84095,Furth,BY|84097,Herrngiersdorf,BY|84098,Hohenthann,BY|84100,Niederaichbach,BY|84101,Obersüßbach,BY|84103,Postau,BY|84104,Rudelzhausen,BY|84106,Volkenschwand,BY|84107,Weihmichl,BY|84109,Wörth,BY|84130,Dingolfing,BY|84137,Aiteröd,BY|84140,Gangkofen,BY|84144,Geisenhausen,BY|84149,Velden,BY|84152,Mengkofen,BY|84155,Bodenkirchen,BY|84160,Frontenhausen,BY|84163,Marklkofen,BY|84164,Dreifaltigkeitsberg, Gem Weng,BY|84166,Adlkofen,BY|84168,Aham,BY|84169,Altfraunhofen,BY|84171,Baierbach,BY|84172,Buch,BY|84174,Eching,BY|84175,Gerzen,BY|84177,Gottfrieding,BY|84178,Kröning,BY|84180,Loiching,BY|84181,Neufraunhofen,BY|84183,Niederviehbach,BY|84184,Tiefenbach,BY|84186,Vilsheim,BY|84187,Weng,BY|84189,Wurmsham,BY|84307,Eggenfelden,BY|84323,Massing,BY|84326,Falkenberg,BY|84329,Wurmannsquick,BY|84332,Hebertsfelden,BY|84333,Malgersdorf,BY|84335,Mitterskirchen,BY|84337,Schönau,BY|84339,Unterdietfurt,BY|84347,Pfarrkirchen,BY|84359,Simbach,BY|84364,Bad Birnbach,BY|84367,Reut,BY|84371,Dachsbergau,BY|84375,Kirchdorf,BY|84378,Dietersburg,BY|84381,Johanniskirchen,BY|84384,Wittibreut,BY|84385,Egglham,BY|84387,Julbach,BY|84389,Postmünster,BY|84405,Brunn,BY|84416,Inning,BY|84419,Birnbach,BY|84424,Isen,BY|84427,Sankt Wolfgang,BY|84428,Bachzelten,BY|84431,Heldenstein,BY|84432,Hohenpolding,BY|84434,Kirchberg,BY|84435,Lengdorf,BY|84437,Reichertsheim,BY|84439,Steinkirchen,BY|84453,Mühldorf,BY|84478,Waldkraiburg,BY|84489,Burghausen,BY|84494,Lohkirchen,BY|84503,Altötting,BY|84508,Burgkirchen,BY|84513,Erharting,BY|84518,Garching,BY|84524,Neuötting,BY|84529,Tittmoning,BY|84533,Haiming,BY|84539,Ampfing,BY|84543,Winhöring,BY|84544,Aschau,BY|84546,Egglkofen,BY|84547,Emmerting,BY|84549,Engelsberg,BY|84550,Feichten,BY|84552,Geratskirchen,BY|84553,Halsbach,BY|84555,Jettenbach,BY|84556,Kastl,BY|84558,Kirchweidach,BY|84559,Kraiburg,BY|84561,Mehring,BY|84562,Mettenheim,BY|84564,Oberbergkirchen,BY|84565,Oberneukirchen,BY|84567,Erlbach,BY|84568,Pleiskirchen,BY|84570,Polling,BY|84571,Reischach,BY|84573,Schönberg,BY|84574,Taufkirchen,BY|84576,Teising,BY|84577,Tüßling,BY|84579,Unterneukirchen,BY|85049,Ingolstadt,BY|85051,Ingolstadt,BY|85053,Ingolstadt,BY|85055,Ingolstadt,BY|85057,Ingolstadt,BY|85072,Eichstätt,BY|85077,Manching,BY|85080,Gaimersheim,BY|85084,Reichertshofen,BY|85088,Vohburg,BY|85092,Kösching,BY|85095,Denkendorf,BY|85098,Großmehring,BY|85101,Lenting,BY|85104,Pförring,BY|85107,Baar-Ebenhausen,BY|85110,Kipfenberg,BY|85111,Adelschlag,BY|85113,Böhmfeld,BY|85114,Buxheim,BY|85116,Egweil,BY|85117,Eitensheim,BY|85119,Ernsgaden,BY|85120,Hepberg,BY|85122,Hitzhofen,BY|85123,Karlskron,BY|85125,Kinding,BY|85126,Münchsmünster,BY|85128,Nassenfels,BY|85129,Oberdolling,BY|85131,Pollenfeld,BY|85132,Schernfeld,BY|85134,Stammham,BY|85135,Titting,BY|85137,Walting,BY|85139,Wettstetten,BY|85221,Dachau,BY|85229,Markt Indersdorf,BY|85232,Bergkirchen,BY|85235,Odelzhausen,BY|85238,Petershausen,BY|85241,Hebertshausen,BY|85244,Röhrmoos,BY|85247,Schwabhausen,BY|85250,Altomünster,BY|85253,Erdweg,BY|85254,Einsbach,BY|85256,Vierkirchen,BY|85258,Weichs,BY|85259,Wiedenzhausen,BY|85276,Feldmühle,BY|85283,Wolnzach,BY|85290,Geisenfeld,BY|85293,Reichertshausen,BY|85296,Rohrbach,BY|85298,Scheyern,BY|85301,Schweitenkirchen,BY|85302,Gerolsbach,BY|85304,Ehrensberg,BY|85305,Jetzendorf,BY|85307,Entrischenbrunn,BY|85309,Pörnbach,BY|85354,Freising,BY|85356,Freising,BY|85368,Moosburg,BY|85375,Neufahrn,BY|85376,Giggenhausen,BY|85386,Eching,BY|85391,Allershausen,BY|85395,Attenkirchen,BY|85399,Hallbergmoos,BY|85402,Kranzberg,BY|85405,Nandlstadt,BY|85406,Wälschbuch,BY|85408,Gammelsdorf,BY|85410,Haag,BY|85411,Hohenkammer,BY|85413,Hörgertshausen,BY|85414,Kirchdorf,BY|85416,Langenbach,BY|85417,Marzling,BY|85419,Mauern,BY|85435,Erding,BY|85445,Oberding,BY|85447,Fraunberg,BY|85452,Moosinning,BY|85456,Wartenberg,BY|85457,Wörth,BY|85459,Berglern,BY|85461,Bockhorn,BY|85462,Eitting,BY|85464,Finsing,BY|85465,Fürnsbach,BY|85467,Neuching,BY|85469,Walpertskirchen,BY|85521,Ottobrunn,BY|85540,Haar,BY|85551,Kirchheim,BY|85560,Ebersberg,BY|85567,Bruck,BY|85570,Köppelmühle,BY|85579,Neubiberg,BY|85586,Poing,BY|85591,Vaterstetten,BY|85598,Baldham,BY|85599,Hergolding,BY|85604,Zorneding,BY|85609,Aschheim,BY|85614,Kirchseeon,BY|85617,Aßling,BY|85622,Feldkirchen,BY|85625,Baiern,BY|85630,Grasbrunn,BY|85635,Höhenkirchen-Siegertsbrunn,BY|85640,Putzbrunn,BY|85643,Steinhöring,BY|85646,Anzing,BY|85649,Brunnthal,BY|85652,Pliening,BY|85653,Aying,BY|85655,Blindham,BY|85656,Buch,BY|85658,Egmating,BY|85659,Forstern,BY|85661,Forstinning,BY|85662,Hohenbrunn,BY|85664,Hohenlinden,BY|85665,Moosach,BY|85667,Oberpframmern,BY|85669,Ödenbach,BY|85716,Unterschleißheim,BY|85737,Ismaning,BY|85748,Garching,BY|85757,Karlsfeld,BY|85764,Hackermoos,BY|85774,Unterföhring,BY|85777,Fahrenzhausen,BY|85778,Haimhausen,BY|86150,Augsburg,BY|86152,Augsburg,BY|86153,Augsburg,BY|86154,Augsburg,BY|86156,Augsburg,BY|86157,Augsburg,BY|86159,Augsburg,BY|86161,Augsburg,BY|86163,Augsburg,BY|86165,Augsburg,BY|86167,Augsburg,BY|86169,Augsburg,BY|86179,Augsburg,BY|86199,Augsburg,BY|86316,Friedberg,BY|86343,Königsbrunn,BY|86356,Neusäß,BY|86368,Gersthofen,BY|86381,Krumbach,BY|86391,Stadtbergen,BY|86399,Bobingen,BY|86405,Meitingen,BY|86415,Mering,BY|86420,Diedorf,BY|86424,Dinkelscherben,BY|86438,Kissing,BY|86441,Zusmarshausen,BY|86444,Affing,BY|86447,Aindling,BY|86450,Altenmünster,BY|86453,Dasing,BY|86456,Gablingen,BY|86459,Gessertshausen,BY|86462,Langweid,BY|86465,Heretsried,BY|86470,Thannhausen,BY|86473,Ziemetshausen,BY|86476,Neuburg,BY|86477,Adelsried,BY|86479,Aichen,BY|86480,Aletshausen,BY|86482,Aystetten,BY|86483,Balzhausen,BY|86485,Biberbach,BY|86486,Bonstetten,BY|86488,Breitenthal,BY|86489,Deisenhausen,BY|86491,Ebershausen,BY|86492,Egling,BY|86494,Emersacker,BY|86495,Eurasburg,BY|86497,Horgau,BY|86498,Kettershausen,BY|86500,Kutzenhausen,BY|86502,Laugna,BY|86504,Merching,BY|86505,Münsterhausen,BY|86507,Kleinaitingen,BY|86508,Rehling,BY|86510,Ried,BY|86511,Schmiechen,BY|86513,Ursberg,BY|86514,Ustersbach,BY|86517,Wehringen,BY|86519,Wiesenbach,BY|86529,Schrobenhausen,BY|86551,Aichach,BY|86554,Pöttmes,BY|86556,Kühbach,BY|86558,Hohenwart,BY|86559,Adelzhausen,BY|86561,Aresing,BY|86562,Berg im Gau,BY|86564,Brunnen,BY|86565,Gachenbach,BY|86567,Hilgertshausen-Tandern,BY|86568,Hollenbach,BY|86570,Inchenhofen,BY|86571,Langenmosen,BY|86573,Obergriesbach,BY|86574,Petersdorf,BY|86576,Schiltberg,BY|86577,Sielenbach,BY|86579,Waidhofen,BY|86609,Donauwörth,BY|86633,Neuburg,BY|86637,Binswangen,BY|86641,Rain,BY|86643,Rennertshofen,BY|86647,Buttenwiesen,BY|86650,Wemding,BY|86653,Daiting,BY|86655,Harburg,BY|86657,Bissingen,BY|86660,Tapfheim,BY|86663,Asbach-Bäumenheim,BY|86666,Burgheim,BY|86668,Karlshuld,BY|86669,Königsmoos,BY|86672,Thierhaupten,BY|86673,Bergheim,BY|86674,Baar,BY|86675,Buchdorf,BY|86676,Ehekirchen,BY|86678,Ehingen,BY|86679,Ellgau,BY|86681,Fünfstetten,BY|86682,Genderkingen,BY|86684,Holzheim,BY|86685,Huisheim,BY|86687,Kaisheim,BY|86688,Marxheim,BY|86690,Mertingen,BY|86692,Münster,BY|86694,Niederschönenfeld,BY|86695,Allmannshofen,BY|86697,Oberhausen,BY|86698,Oberndorf,BY|86700,Otting,BY|86701,Rohrenfels,BY|86703,Rögling,BY|86704,Tagmersheim,BY|86706,Weichering,BY|86707,Kühlenthal,BY|86709,Wolferstadt,BY|86720,Nördlingen,BY|86732,Oettingen,BY|86733,Alerheim,BY|86735,Amerdingen,BY|86736,Auhausen,BY|86738,Deiningen,BY|86739,Ederheim,BY|86741,Ehingen,BY|86742,Fremdingen,BY|86744,Hainsfarth,BY|86745,Hohenaltheim,BY|86747,Maihingen,BY|86748,Marktoffingen,BY|86750,Megesheim,BY|86751,Mönchsdeggingen,BY|86753,Möttingen,BY|86754,Munningen,BY|86756,Reimlingen,BY|86757,Wallerstein,BY|86759,Wechingen,BY|86807,Buchloe,BY|86825,Bad Wörishofen,BY|86830,Schwabmünchen,BY|86833,Ettringen,BY|86836,Graben,BY|86842,Türkheim,BY|86845,Großaitingen,BY|86850,Fischach,BY|86853,Langerringen,BY|86854,Amberg,BY|86856,Hiltenfingen,BY|86857,Hurlach,BY|86859,Igling,BY|86860,Jengen,BY|86862,Lamerdingen,BY|86863,Langenneufnach,BY|86865,Markt Wald,BY|86866,Mickhausen,BY|86868,Mittelneufnach,BY|86869,Oberostendorf,BY|86871,Rammingen,BY|86872,Scherstetten,BY|86874,Tussenhausen,BY|86875,Waal,BY|86877,Walkertshofen,BY|86879,Wiedergeltingen,BY|86899,Landsberg,BY|86911,Dießen,BY|86916,Kaufering,BY|86919,Utting,BY|86920,Denklingen,BY|86922,Eresing,BY|86923,Finning,BY|86925,Fuchstal,BY|86926,Algertshausen,BY|86928,Hofstetten,BY|86929,Penzing,BY|86931,Prittriching,BY|86932,Pürgen,BY|86934,Reichling,BY|86935,Rott,BY|86937,Scheuring,BY|86938,Schondorf,BY|86940,Schwifting,BY|86941,St Ottilien,BY|86943,Thaining,BY|86944,Unterdießen,BY|86946,Vilgertshofen,BY|86947,Weil,BY|86949,Windach,BY|86956,Schongau,BY|86971,Peiting,BY|86972,Altenstadt,BY|86974,Apfeldorf,BY|86975,Bernbeuren,BY|86977,Burggen,BY|86978,Hohenfurch,BY|86980,Ingenried,BY|86981,Kinsau,BY|86983,Lechbruck,BY|86984,Prem,BY|86986,Schwabbruck,BY|86987,Schwabsoien,BY|86989,Deutenried,BY|87435,Kempten,BY|87437,Kempten,BY|87439,Kempten,BY|87448,Waltenhofen,BY|87452,Altusried,BY|87459,Pfronten,BY|87463,Dietmannsried,BY|87466,Oy-Mittelberg,BY|87471,Durach,BY|87474,Buchenberg,BY|87477,Sulzberg,BY|87480,Weitnau,BY|87484,Nesselwang,BY|87487,Wiggensbach,BY|87488,Betzigau,BY|87490,Haldenwang,BY|87493,Lauben,BY|87494,Rückholz,BY|87496,Untrasried,BY|87497,Wertach,BY|87499,Wildpoldsried,BY|87509,Immenstadt,BY|87527,Ofterschwang,BY|87534,Oberstaufen,BY|87538,Balderschwang,BY|87541,Hindelang,BY|87544,Blaichach,BY|87545,Burgberg,BY|87547,Missen-Wilhams,BY|87549,Rettenberg,BY|87561,Oberstdorf,BY|87600,Kaufbeuren,BY|87616,Marktoberdorf,BY|87629,Füssen,BY|87634,Günzach,BY|87637,Eisenberg,BY|87640,Biessenhofen,BY|87642,Halblech,BY|87645,Schwangau,BY|87647,Kraftisried,BY|87648,Aitrang,BY|87650,Baisweil,BY|87651,Bidingen,BY|87653,Eggenthal,BY|87654,Friesenried,BY|87656,Germaringen,BY|87657,Görisried,BY|87659,Hopferau,BY|87660,Irsee,BY|87662,Kaltental,BY|87663,Lengenwang,BY|87665,Mauerstetten,BY|87666,Pforzen,BY|87668,Rieden,BY|87669,Rieden,BY|87671,Flohkraut,BY|87672,Roßhaupten,BY|87674,Ruderatshofen,BY|87675,Rettenbach,BY|87677,Stöttwang,BY|87679,Westendorf,BY|87700,Memmingen,BY|87719,Mindelheim,BY|87724,Krautenberg,BY|87727,Babenhausen,BY|87730,Bad Grönenbach,BY|87733,Markt Rettenbach,BY|87734,Benningen,BY|87736,Böhen,BY|87737,Boos,BY|87739,Breitenbrunn,BY|87740,Buxheim,BY|87742,Apfeltrach,BY|87743,Betzenhausen,BY|87745,Eppishausen,BY|87746,Erkheim,BY|87748,Fellheim,BY|87749,Hawangen,BY|87751,Heimertingen,BY|87752,Holzgünz,BY|87754,Kammlach,BY|87755,Kirchhaslach,BY|87757,Bronnerlehe,BY|87758,Kronburg,BY|87760,Lachen,BY|87761,Lauben,BY|87763,Lautrach,BY|87764,Legau,BY|87766,Memmingerberg,BY|87767,Niederrieden,BY|87769,Oberrieden,BY|87770,Beblinstetten,BY|87772,Pfaffenhausen,BY|87773,Pleß,BY|87775,Salgen,BY|87776,Sontheim,BY|87778,Stetten,BY|87779,Trunkelsberg,BY|87781,Ungerhausen,BY|87782,Sonderhof,BY|87784,Westerheim,BY|87785,Winterrieden,BY|87787,Wolfertschwenden,BY|87789,Woringen,BY|88045,Friedrichshafen,BW|88046,Friedrichshafen,BW|88048,Friedrichshafen,BW|88069,Tettnang,BW|88074,Meckenbeuren,BW|88079,Kressbronn,BW|88085,Langenargen,BW|88090,Immenstaad,BW|88094,Oberteuringen,BW|88097,Eriskirch,BW|88099,Neukirch,BW|88131,Bodolz,BY|88138,Hergensweiler,BY|88142,Wasserburg,BY|88145,Hergatz,BY|88147,Achberg,BW|88149,Nonnenhorn,BY|88161,Lindenberg,BY|88167,Gestratz,BY|88171,Weiler-Simmerberg,BY|88175,Scheidegg,BY|88178,Heimenkirch,BY|88179,Oberreute,BY|88212,Ravensburg,BW|88213,Ravensburg,BW|88214,Ravensburg,BW|88239,Wangen,BW|88250,Weingarten,BW|88255,Baienfurt,BW|88260,Argenbühl,BW|88263,Horgenzell,BW|88267,Vogt,BW|88271,Wilhelmsdorf,BW|88273,Fronreute,BW|88276,Berg,BW|88279,Amtzell,BW|88281,Schlier,BW|88284,Wolpertswende,BW|88285,Bodnegg,BW|88287,Grünkraut,BW|88289,Waldburg,BW|88299,Leutkirch,BW|88316,Isny,BW|88317,Aichstetten,BW|88319,Aitrach,BW|88326,Aulendorf,BW|88339,Bad Waldsee,BW|88348,Allmannsweiler,BW|88353,Kißlegg,BW|88356,Ostrach,BW|88361,Altshausen,BW|88364,Wolfegg,BW|88367,Hohentengen,BW|88368,Bergatreute,BW|88370,Ebenweiler,BW|88371,Ebersbach-Musbach,BW|88373,Fleischwangen,BW|88374,Hoßkirch,BW|88376,Königseggwald,BW|88377,Riedhausen,BW|88379,Guggenhausen,BW|88400,Biberach,BW|88410,Bad Wurzach,BW|88416,Erlenmoos,BW|88422,Alleshausen,BW|88427,Bad Schussenried,BW|88430,Emishalden,BW|88433,Schemmerhofen,BW|88436,Eberhardzell,BW|88437,Maselheim,BW|88441,Bahnstock,BW|88444,Ummendorf,BW|88447,Warthausen,BW|88448,Attenweiler,BW|88450,Berkheim,BW|88451,Dettingen,BW|88453,Erolzheim,BW|88454,Hochdorf,BW|88456,Ingoldingen,BW|88457,Kirchdorf,BW|88459,Rudeshof,BW|88471,Laupheim,BW|88477,Schwendi,BW|88480,Achstetten,BW|88481,Balzheim,BW|88483,Burgrieden,BW|88484,Gutenzell-Hürbel,BW|88486,Kirchberg,BW|88487,Mietingen,BW|88489,Wain,BW|88499,Altheim,BW|88512,Mengen,BW|88515,Langenenslingen,BW|88518,Herbertingen,BW|88521,Ertingen,BW|88524,Uttenweiler,BW|88525,Dürmentingen,BW|88527,Unlingen,BW|88529,Zwiefalten,BW|88605,Meßkirch,BW|88630,Pfullendorf,BW|88631,Beuron,BW|88633,Heiligenberg,BW|88634,Herdwangen-Schönach,BW|88636,Illmensee,BW|88637,Buchheim,BW|88639,Wald,BW|88662,Überlingen,BW|88677,Markdorf,BW|88682,Salem,BW|88690,Uhldingen-Mühlhofen,BW|88693,Deggenhausertal,BW|88696,Owingen,BW|88697,Bermatingen,BW|88699,Frickingen,BW|88709,Hagnau,BW|88718,Daisendorf,BW|88719,Stetten,BW|89073,Ulm,BW|89075,Ulm,BW|89077,Ulm,BW|89079,Ulm,BW|89081,Seligweiler,BY|89129,Langenau,BW|89134,Blaustein,BW|89143,Blaubeuren,BW|89150,Laichingen,BW|89155,Erbach,BW|89160,Dornstadt,BW|89165,Dietenheim,BW|89168,Niederstotzingen,BW|89171,Illerkirchberg,BW|89173,Lonsee,BW|89174,Altheim,BW|89176,Asselfingen,BW|89177,Ballendorf,BW|89179,Beimerstetten,BW|89180,Berghülen,BW|89182,Bernstadt,BW|89183,Breitingen,BW|89185,Hüttisheim,BW|89186,Illerrieden,BW|89188,Merklingen,BW|89189,Neenstetten,BW|89191,Nellingen,BW|89192,Rammingen,BW|89194,Schnürpflingen,BW|89195,Staig,BW|89197,Weidenstetten,BW|89198,Westerstetten,BW|89231,Neu-Ulm,BY|89233,Neu-Ulm,BY|89250,Senden,BY|89257,Illertissen,BY|89264,Dirrfelden,BY|89269,Vöhringen,BY|89275,Elchingen,BY|89278,Nersingen,BY|89281,Altenstadt,BY|89284,Pfaffenhofen,BY|89287,Bellenberg,BY|89290,Buch,BY|89291,Holzheim,BY|89293,Kellmünz,BY|89294,Oberroth,BY|89296,Osterberg,BY|89297,Roggenburg,BY|89299,Unterroth,BY|89312,Günzburg,BY|89331,Burgau,BY|89335,Brandfeld,BY|89340,Leipheim,BY|89343,Jettingen-Scheppach,BY|89344,Aislingen,BY|89346,Bibertal,BY|89347,Bubesheim,BY|89349,Burtenbach,BY|89350,Dürrlauingen,BY|89352,Ellzee,BY|89353,Glött,BY|89355,Gundremmingen,BY|89356,Haldenwang,BY|89358,Kammeltal,BY|89359,Kötz,BY|89361,Landensberg,BY|89362,Offingen,BY|89364,Rettenbach,BY|89365,Röfingen,BY|89367,Waldstetten,BY|89368,Winterbach,BY|89407,Dillingen,BY|89415,Lauingen,BY|89420,Höchstädt,BY|89423,Gundelfingen,BY|89426,Mödingen,BY|89428,Syrgenstein,BY|89429,Bachhagel,BY|89431,Bächingen,BY|89434,Blindheim,BY|89435,Finningen,BY|89437,Haunsheim,BY|89438,Holzheim,BY|89440,Lutzingen,BY|89441,Medlingen,BY|89443,Schwenningen,BY|89446,Ziertheim,BY|89447,Zöschingen,BY|89518,Heidenheim,BW|89520,Heidenheim,BW|89522,Asbach,BW|89537,Gerschweiler,BW|89542,Herbrechtingen,BW|89547,Gerstetten,BW|89551,Königsbronn,BW|89555,Steinheim,BW|89558,Böhmenkirch,BW|89561,Dischingen,BW|89564,Nattheim,BW|89567,Sontheim,BW|89568,Hermaringen,BW|89584,Ehingen,BW|89597,Hausen,BW|89601,Karlshof,BW|89604,Allmendingen,BW|89605,Altheim,BW|89607,Emerkingen,BW|89608,Griesingen,BW|89610,Oberdischingen,BW|89611,Brühlhof,BW|89613,Grundsheim,BW|89614,Öpfingen,BW|89616,Rottenacker,BW|89617,Untermarchtal,BW|89619,Unterstadion,BW|90402,Nürnberg,BY|90403,Nürnberg,BY|90408,Nürnberg,BY|90409,Nürnberg,BY|90411,Nürnberg,BY|90419,Nürnberg,BY|90425,Nürnberg,BY|90427,Nürnberg,BY|90429,Nürnberg,BY|90431,Nürnberg,BY|90439,Nürnberg,BY|90441,Nürnberg,BY|90443,Nürnberg,BY|90449,Nürnberg,BY|90451,Nürnberg,BY|90453,Nürnberg,BY|90455,Nürnberg,BY|90459,Nürnberg,BY|90461,Nürnberg,BY|90469,Nürnberg,BY|90471,Nürnberg,BY|90473,Nürnberg,BY|90475,Nürnberg,BY|90478,Nürnberg,BY|90480,Nürnberg,BY|90482,Nürnberg,BY|90489,Nürnberg,BY|90491,Nürnberg,BY|90513,Zirndorf,BY|90518,Altdorf,BY|90522,Oberasbach,BY|90530,Wendelstein,BY|90537,Feucht,BY|90542,Eckental,BY|90547,Stein,BY|90552,Röthenbach,BY|90556,Cadolzburg,BY|90559,Burgthann,BY|90562,Heroldsberg,BY|90571,Schwaig,BY|90574,Roßtal,BY|90579,Langenzenn,BY|90584,Allersberg,BY|90587,Obermichelbach,BY|90592,Schwarzenbruck,BY|90596,Schwanstetten,BY|90599,Dietenhofen,BY|90602,Pyrbaum,BY|90607,Rückersdorf,BY|90610,Winkelhaid,BY|90613,Großhabersdorf,BY|90614,Ammerndorf,BY|90616,Neuhof,BY|90617,Puschendorf,BY|90619,Trautskirchen,BY|90762,Fürth,BY|90763,Fürth,BY|90765,Fürth,BY|90766,Fürth,BY|90768,Fürth,BY|91052,Erlangen,BY|91054,Buckenhof,BY|91056,Erlangen,BY|91058,Erlangen,BY|91074,Herzogenaurach,BY|91077,Dormitz,BY|91080,Marloffstein,BY|91083,Baiersdorf,BY|91085,Weisendorf,BY|91086,Aurachtal,BY|91088,Bubenreuth,BY|91090,Effeltrich,BY|91091,Großenseebach,BY|91093,Heßdorf,BY|91094,Langensendelbach,BY|91096,Möhrendorf,BY|91097,Oberreichenbach,BY|91099,Poxdorf,BY|91126,Kammerstein,BY|91154,Roth,BY|91161,Hilpoltstein,BY|91166,Georgensgmünd,BY|91171,Greding,BY|91174,Spalt,BY|91177,Thalmässing,BY|91180,Heideck,BY|91183,Abenberg,BY|91186,Büchenbach,BY|91187,Röttenbach,BY|91189,Rohr,BY|91207,Lauf,BY|91217,Hersbruck,BY|91220,Schnaittach,BY|91224,Pommelsbrunn,BY|91227,Leinburg,BY|91230,Happurg,BY|91233,Neunkirchen,BY|91235,Hartenstein,BY|91236,Alfeld,BY|91238,Engelthal,BY|91239,Henfenfeld,BY|91241,Kirchensittenbach,BY|91242,Ottensoos,BY|91244,Reichenschwand,BY|91245,Simmelsdorf,BY|91247,Vorra,BY|91249,Weigendorf,BY|91257,Pegnitz,BY|91275,Auerbach,BY|91278,Pottenstein,BY|91281,Kirchenthumbach,BY|91282,Betzenstein,BY|91284,Neuhaus,BY|91286,Obertrubach,BY|91287,Plech,BY|91289,Schnabelwaid,BY|91301,Forchheim,BY|91315,Höchstadt,BY|91320,Ebermannstadt,BY|91322,Gräfenberg,BY|91325,Adelsdorf,BY|91327,Gößweinstein,BY|91330,Eggolsheim,BY|91332,Heiligenstadt,BY|91334,Hemhofen,BY|91336,Heroldsbach,BY|91338,Igensdorf,BY|91341,Röttenbach,BY|91344,Fuchshof,BY|91346,Wiesenttal,BY|91347,Aufseß,BY|91349,Egloffstein,BY|91350,Gremsdorf,BY|91352,Hallerndorf,BY|91353,Hausen,BY|91355,Hiltpoltstein,BY|91356,Kirchehrenbach,BY|91358,Kunreuth,BY|91359,Leutenbach,BY|91361,Pinzberg,BY|91362,Pretzfeld,BY|91364,Unterleinleiter,BY|91365,Weilersbach,BY|91367,Weißenohe,BY|91369,Wiesenthau,BY|91413,Neustadt,BY|91438,Bad Windsheim,BY|91443,Scheinfeld,BY|91448,Emskirchen,BY|91452,Wilhermsdorf,BY|91456,Diespeck,BY|91459,Markt Erlbach,BY|91460,Baudenbach,BY|91462,Dachsbach,BY|91463,Dietersheim,BY|91465,Ergersheim,BY|91466,Gerhardshofen,BY|91468,Gutenstetten,BY|91469,Erlachskirchen,BY|91471,Illesheim,BY|91472,Ipsheim,BY|91474,Langenfeld,BY|91475,Lonnerstadt,BY|91477,Markt Bibart,BY|91478,Markt Nordheim,BY|91480,Markt Taschendorf,BY|91481,Münchsteinach,BY|91483,Oberscheinfeld,BY|91484,Sugenheim,BY|91486,Uehlfeld,BY|91487,Vestenbergsgreuth,BY|91489,Tanzenhaid,BY|91522,Ansbach,BY|91541,Rothenburg,BY|91550,Dinkelsbühl,BY|91555,Feuchtwangen,BY|91560,Heilsbronn,BY|91564,Neuendettelsau,BY|91567,Herrieden,BY|91572,Bechhofen,BY|91575,Windsbach,BY|91578,Leutershausen,BY|91580,Petersaurach,BY|91583,Diebach,BY|91586,Lichtenau,BY|91587,Adelshofen,BY|91589,Aurach,BY|91590,Bruckberg,BY|91592,Buch a. Wald,BY|91593,Burgbernheim,BY|91595,Burgoberbach,BY|91596,Burk,BY|91598,Colmberg,BY|91599,Dentlein,BY|91601,Dombühl,BY|91602,Dürrwangen,BY|91604,Flachslanden,BY|91605,Gallmersgarten,BY|91607,Gebsattel,BY|91608,Geslau,BY|91610,Insingen,BY|91611,Lehrberg,BY|91613,Marktbergel,BY|91614,Mönchsroth,BY|91616,Neusitz,BY|91617,Oberdachstetten,BY|91619,Obernzenn,BY|91620,Ohrenbach,BY|91622,Rügland,BY|91623,Sachsen,BY|91625,Schnelldorf,BY|91626,Schopfloch,BY|91628,Steinsfeld,BY|91629,Weihenzell,BY|91631,Wettringen,BY|91632,Wieseth,BY|91634,Wilburgstetten,BY|91635,Windelsbach,BY|91637,Wörnitz,BY|91639,Wolframs-Eschenbach,BY|91710,Gunzenhausen,BY|91717,Linkersbaindt,BY|91719,Heidenheim,BY|91720,Absberg,BY|91722,Arberg,BY|91723,Dittenheim,BY|91725,Ehingen,BY|91726,Gerolfingen,BY|91728,Gnotzheim,BY|91729,Haundorf,BY|91731,Langfurth,BY|91732,Merkendorf,BY|91734,Mitteleschenbach,BY|91735,Muhr,BY|91737,Ornbau,BY|91738,Pfofeld,BY|91740,Röckingen,BY|91741,Theilenhofen,BY|91743,Unterschwaningen,BY|91744,Weiltingen,BY|91746,Weidenbach,BY|91747,Westheim,BY|91749,Wittelshofen,BY|91757,Treuchtlingen,BY|91781,Weißenburg,BY|91785,Pleinfeld,BY|91788,Altheimersberg,BY|91790,Bergen,BY|91792,Ellingen,BY|91793,Alesheim,BY|91795,Dollnstein,BY|91796,Ettenstatt,BY|91798,Höttingen,BY|91799,Langenaltheim,BY|91801,Markt Berolzheim,BY|91802,Meinheim,BY|91804,Mörnsheim,BY|91805,Polsingen,BY|91807,Lichtenberg,BY|91809,Wellheim,BY|92224,Amberg,BY|92237,Sulzbach-Rosenberg,BY|92242,Hirschau,BY|92245,Kümmersbruck,BY|92249,Vilseck,BY|92253,Schnaittenbach,BY|92256,Hahnbach,BY|92259,Neukirchen,BY|92260,Ammerthal,BY|92262,Birgland,BY|92263,Ebermannsdorf,BY|92265,Edelsfeld,BY|92266,Ensdorf,BY|92268,Etzelwang,BY|92269,Fensterbach,BY|92271,Freihung,BY|92272,Freudenberg,BY|92274,Gebenbach,BY|92275,Hirschbach,BY|92277,Hohenburg,BY|92278,Illschwang,BY|92280,Kastl,BY|92281,Königstein,BY|92283,Lauterhofen,BY|92284,Poppenricht,BY|92286,Rieden,BY|92287,Schmidmühlen,BY|92289,Ursensollen,BY|92318,Neumarkt,BY|92331,Lupburg,BY|92334,Berching,BY|92339,Beilngries,BY|92342,Freystadt,BY|92345,Dietfurt,BY|92348,Berg,BY|92353,Postbauer-Heng,BY|92355,Velburg,BY|92358,Seubersdorf,BY|92360,Mühlhausen,BY|92361,Berngau,BY|92363,Breitenbrunn,BY|92364,Deining,BY|92366,Hohenfels,BY|92367,Pilsach,BY|92369,Sengenthal,BY|92421,Schwandorf,BY|92431,Neunburg,BY|92436,Bruck,BY|92439,Bodenwöhr,BY|92442,Wackersdorf,BY|92444,Rötz,BY|92445,Neukirchen-Balbini,BY|92447,Schwarzhofen,BY|92449,Steinberg,BY|92507,Nabburg,BY|92521,Schwarzenfeld,BY|92526,Oberviechtach,BY|92533,Wernberg-Köblitz,BY|92536,Pfreimd,BY|92539,Schönsee,BY|92540,Altendorf,BY|92542,Dieterskirchen,BY|92543,Guteneck,BY|92545,Niedermurach,BY|92546,Schmidgaden,BY|92548,Schwarzach,BY|92549,Stadlern,BY|92551,Stulln,BY|92552,Teunz,BY|92554,Thanstein,BY|92555,Trausnitz,BY|92557,Weiding,BY|92559,Winklarn,BY|92637,Theisseil,BY|92648,Vohenstrauß,BY|92655,Grafenwöhr,BY|92660,Neustadt,BY|92665,Altenstadt,BY|92670,Windischeschenbach,BY|92676,Eschenbach,BY|92681,Erbendorf,BY|92685,Floß,BY|92690,Glashütte,BY|92693,Eslarn,BY|92694,Etzenricht,BY|92696,Flossenbürg,BY|92697,Georgenberg,BY|92699,Bechtsrieth,BY|92700,Kaltenbrunn,BY|92702,Kohlberg,BY|92703,Krummennaab,BY|92705,Leuchtenberg,BY|92706,Luhe-Wildenau,BY|92708,Mantel,BY|92709,Moosbach,BY|92711,Parkstein,BY|92712,Pirk,BY|92714,Pleystein,BY|92715,Püchersreuth,BY|92717,Reuth,BY|92718,Schirmitz,BY|92720,Schwarzenbach,BY|92721,Störnstein,BY|92723,Gleiritsch,BY|92724,Trabitz,BY|92726,Waidhaus,BY|92727,Waldthurn,BY|92729,Weiherhammer,BY|93047,Regensburg,BY|93049,Regensburg,BY|93051,Regensburg,BY|93053,Regensburg,BY|93055,Regensburg,BY|93057,Regensburg,BY|93059,Regensburg,BY|93073,Neutraubling,BY|93077,Bad Abbach,BY|93080,Pentling,BY|93083,Obertraubling,BY|93086,Wörth,BY|93087,Alteglofsheim,BY|93089,Aufhausen,BY|93090,Bach,BY|93092,Barbing,BY|93093,Donaustauf,BY|93095,Hagelstadt,BY|93096,Köfering,BY|93098,Mintraching,BY|93099,Mötzing,BY|93101,Pfakofen,BY|93102,Pfatter,BY|93104,Riekofen,BY|93105,Tegernheim,BY|93107,Thalmassing,BY|93109,Wiesent,BY|93128,Regenstauf,BY|93133,Burglengenfeld,BY|93138,Lappersdorf,BY|93142,Maxhütte-Haidhof,BY|93149,Nittenau,BY|93152,Deckelstein,BY|93155,Hemau,BY|93158,Teublitz,BY|93161,Grafenried,BY|93164,Brunn,BY|93167,Falkenstein,BY|93170,Bernhardswald,BY|93173,Wenzenbach,BY|93176,Beratzhausen,BY|93177,Altenthann,BY|93179,Brennberg,BY|93180,Deuerling,BY|93182,Duggendorf,BY|93183,Holzheim,BY|93185,Michelsneukirchen,BY|93186,Pettendorf,BY|93188,Pielenhofen,BY|93189,Reichenbach,BY|93191,Rettenbach,BY|93192,Wald,BY|93194,Walderbach,BY|93195,Biersackschlag,BY|93197,Zeitlarn,BY|93199,Zell,BY|93309,Kelheim,BY|93326,Abensberg,BY|93333,Neustadt,BY|93336,Altmannstein,BY|93339,Riedenburg,BY|93342,Saal,BY|93343,Essing,BY|93345,Hausen,BY|93346,Ihrlerstein,BY|93348,Kirchdorf,BY|93349,Mindelstetten,BY|93351,Painten,BY|93352,Rohr,BY|93354,Biburg,BY|93356,Teugn,BY|93358,Train,BY|93359,Wildenberg,BY|93413,Cham,BY|93426,Roding,BY|93437,Dürnberg,BY|93444,Kötzting,BY|93449,Albernhof,BY|93453,Neukirchen,BY|93455,Traitsching,BY|93458,Eschlkam,BY|93462,Lam,BY|93464,Tiefenbach,BY|93466,Chamerau,BY|93468,Miltach,BY|93470,Lohberg,BY|93471,Arnbruck,BY|93473,Arnschwang,BY|93474,Arrach,BY|93476,Blaibach,BY|93477,Gleißenberg,BY|93479,Grafenwiesen,BY|93480,Hohenwarth,BY|93482,Pemfling,BY|93483,Pösing,BY|93485,Rimbach,BY|93486,Runding,BY|93488,Schönthal,BY|93489,Schorndorf,BY|93491,Stamsried,BY|93492,Treffelstein,BY|93494,Waffenbrunn,BY|93495,Weiding,BY|93497,Willmering,BY|93499,Zandt,BY|94032,Passau,BY|94034,Passau,BY|94036,Abraham,BY|94051,Hauzenberg,BY|94060,Breitwies,BY|94065,Waldkirchen,BY|94072,Bad Füssing,BY|94078,Freyung,BY|94081,Fürstenzell,BY|94086,Bad Griesbach,BY|94089,Neureichenau,BY|94094,Malching,BY|94099,Ruhstorf,BY|94104,Tittling,BY|94107,Rollhäusl,BY|94110,Wegscheid,BY|94113,Tiefenbach,BY|94116,Hutthurm,BY|94118,Jandelsbrunn,BY|94121,Salzweg,BY|94124,Büchlberg,BY|94127,Neuburg,BY|94130,Obernzell,BY|94133,Röhrnbach,BY|94136,Thyrnau,BY|94137,Bayerbach,BY|94139,Breitenberg,BY|94140,Ering,BY|94142,Fürsteneck,BY|94143,Grainet,BY|94145,Haidmühle,BY|94146,Hinterschmiding,BY|94148,Kirchham,BY|94149,Kößlarn,BY|94151,Mauth,BY|94152,Neuhaus,BY|94154,Neukirchen,BY|94155,Otterskirchen,BY|94157,Perlesreut,BY|94158,Philippsreut,BY|94160,Ringelai,BY|94161,Ruderting,BY|94163,Saldenburg,BY|94164,Sonnen,BY|94166,Stubenberg,BY|94167,Tettenweis,BY|94169,Thurmansbang,BY|94209,Regen,BY|94227,Lindberg,BY|94234,Viechtach,BY|94239,Gotteszell,BY|94244,Geiersthal,BY|94249,Bodenmais,BY|94250,Achslach,BY|94252,Bayerisch Eisenstein,BY|94253,Bischofsmais,BY|94255,Böbrach,BY|94256,Drachselsried,BY|94258,Frauenau,BY|94259,Kirchberg i. Wald,BY|94261,Kirchdorf,BY|94262,Kollnburg,BY|94264,Langdorf,BY|94265,Patersdorf,BY|94267,Prackenbach,BY|94269,Rinchnach,BY|94315,Straubing,BY|94327,Bogen,BY|94330,Aiterhofen,BY|94333,Geiselhöring,BY|94336,Hunderdorf,BY|94339,Leiblfing,BY|94342,Irlbach,BY|94344,Wiesenfelden,BY|94345,Aholfing,BY|94347,Ascha,BY|94348,Atting,BY|94350,Falkenfels,BY|94351,Feldkirchen,BY|94353,Haibach,BY|94354,Haselbach,BY|94356,Kirchroth,BY|94357,Höhenstein,BY|94359,Loitzendorf,BY|94360,Mitterfels,BY|94362,Neukirchen,BY|94363,Oberschneiding,BY|94365,Parkstetten,BY|94366,Perasdorf,BY|94368,Perkam,BY|94369,Rain,BY|94371,Rattenberg,BY|94372,Rattiszell,BY|94374,Eckhütt,BY|94375,Stallwang,BY|94377,Steinach,BY|94379,Sankt Englmar,BY|94405,Landau,BY|94419,Reisbach,BY|94424,Arnstorf,BY|94428,Eichendorf,BY|94431,Pilsting,BY|94436,Simbach,BY|94437,Mamming,BY|94439,Roßbach,BY|94447,Plattling,BY|94469,Deggendorf,BY|94474,Vilshofen,BY|94481,Grafenau,BY|94486,Osterhofen,BY|94491,Hengersberg,BY|94496,Ortenburg,BY|94501,Aidenbach,BY|94505,Bernried,BY|94508,Schöllnach,BY|94513,Schönberg,BY|94518,Linden,BY|94522,Wallersdorf,BY|94526,Dammersbach,BY|94527,Aholming,BY|94529,Aicha,BY|94530,Auerbach,BY|94532,Außernzell,BY|94533,Buchhofen,BY|94535,Eging,BY|94536,Eppenschlag,BY|94538,Fürstenstein,BY|94539,Grafling,BY|94541,Grattersdorf,BY|94542,Haarbach,BY|94544,Hofkirchen,BY|94545,Hohenau,BY|94547,Iggensbach,BY|94548,Innernzell,BY|94550,Künzing,BY|94551,Hunding,BY|94553,Mariaposching,BY|94554,Moos,BY|94556,Neuschönau,BY|94557,Niederalteich,BY|94559,Niederwinkling,BY|94560,Offenberg,BY|94562,Oberpöring,BY|94563,Otzing,BY|94565,Bertholling,BY|94566,Reichenberg b Riedlhütte,BY|94568,Auwies,BY|94569,Stephansposching,BY|94571,Schaufling,BY|94572,Schöfweg,BY|94574,Wallerfing,BY|94575,Windorf,BY|94577,Winzer,BY|94579,Zenting,BY|95028,Hof,BY|95030,Hof,BY|95032,Hof,BY|95100,Selb,BY|95111,Rehau,BY|95119,Naila,BY|95126,Schwarzenbach a d Saale,BY|95131,Fels,BY|95138,Bad Steben,BY|95145,Oberkotzau,BY|95152,Selbitz,BY|95158,Kirchenlamitz,BY|95163,Weißenstadt,BY|95168,Marktleuthen,BY|95173,Schönwald,BY|95176,Konradsreuth,BY|95179,Geroldsgrün,BY|95180,Berg,BY|95182,Döhlau,BY|95183,Feilitzsch,BY|95185,Gattendorf,BY|95186,Höchstädt,BY|95188,Issigau,BY|95189,Fattigsmühle,BY|95191,Leupoldsgrün,BY|95192,Lichtenberg,BY|95194,Regnitzlosau,BY|95195,Röslau,BY|95197,Schauenstein,BY|95199,Thierstein,BY|95213,Münchberg,BY|95233,Helmbrechts,BY|95234,Sparneck,BY|95236,Hinterbug,BY|95237,Weißdorf,BY|95239,Zell,BY|95326,Kulmbach,BY|95336,Mainleus,BY|95339,Neuenmarkt,BY|95346,Stadtsteinach,BY|95349,Thurnau,BY|95352,Marktleugast,BY|95355,Presseck,BY|95356,Grafengehaig,BY|95358,Guttenberg,BY|95359,Kasendorf,BY|95361,Ködnitz,BY|95362,Kupferberg,BY|95364,Ludwigschorgast,BY|95365,Rugendorf,BY|95367,Trebgast,BY|95369,Untersteinach,BY|95444,Bayreuth,BY|95445,Bayreuth,BY|95447,Bayreuth,BY|95448,Bayreuth,BY|95460,Bad Berneck,BY|95463,Bindlach,BY|95466,Kirchenpingarten,BY|95469,Speichersdorf,BY|95473,Creußen,BY|95478,Kemnath,BY|95482,Gefrees,BY|95485,Warmensteinach,BY|95488,Eckersdorf,BY|95490,Mistelgau,BY|95491,Ahorntal,BY|95493,Bischofsgrün,BY|95494,Gesees,BY|95496,Glashütten,BY|95497,Goldkronach,BY|95499,Harsdorf,BY|95500,Heinersreuth,BY|95502,Himmelkron,BY|95503,Hummeltal,BY|95505,Immenreuth,BY|95506,Kastl,BY|95508,Kulmain,BY|95509,Marktschorgast,BY|95511,Mistelbach,BY|95512,Neudrossenfeld,BY|95514,Neustadt,BY|95515,Plankenfels,BY|95517,Emtmannsberg,BY|95519,Schlammersdorf,BY|95615,Marktredwitz,BY|95632,Wunsiedel,BY|95643,Tirschenreuth,BY|95652,Waldsassen,BY|95659,Arzberg,BY|95666,Leonberg,BY|95671,Bärnau,BY|95676,Wiesau,BY|95679,Waldershof,BY|95680,Bad Alexandersbad,BY|95682,Brand,BY|95683,Ebnath,BY|95685,Falkenberg,BY|95686,Fichtelberg,BY|95688,Friedenfels,BY|95689,Fuchsmühl,BY|95691,Hohenberg,BY|95692,Konnersreuth,BY|95694,Mehlmeisel,BY|95695,Mähring,BY|95697,Nagel,BY|95698,Neualbenreuth,BY|95700,Neusorg,BY|95701,Pechbrunn,BY|95703,Auerberg,BY|95704,Pullenreuth,BY|95706,Schirnding,BY|95707,Thiersheim,BY|95709,Tröstau,BY|96047,Bamberg,BY|96049,Bamberg,BY|96050,Bamberg,BY|96052,Bamberg,BY|96103,Hallstadt,BY|96106,Ebern,BY|96110,Scheßlitz,BY|96114,Hirschaid,BY|96117,Memmelsdorf,BY|96120,Bischberg,BY|96123,Litzendorf,BY|96126,Ermershausen,BY|96129,Strullendorf,BY|96132,Schlüsselfeld,BY|96135,Stegaurach,BY|96138,Burgebrach,BY|96142,Hollfeld,BY|96145,Seßlach,BY|96146,Altendorf,BY|96148,Baunach,BY|96149,Breitengüßbach,BY|96151,Breitbrunn,BY|96152,Burghaslach,BY|96154,Burgwindheim,BY|96155,Buttenheim,BY|96157,Ebrach,BY|96158,Frensdorf,BY|96160,Geiselwind,BY|96161,Gerach,BY|96163,Gundelsheim,BY|96164,Kemmern,BY|96166,Kirchlauter,BY|96167,Königsfeld,BY|96169,Lauter,BY|96170,Lisberg,BY|96172,Mühlhausen,BY|96173,Oberhaid,BY|96175,Pettstadt,BY|96176,Pfarrweisach,BY|96178,Pommersfelden,BY|96179,Rattelsdorf,BY|96181,Rauhenebrach,BY|96182,Reckendorf,BY|96184,Rentweinsdorf,BY|96185,Schönbrunn,BY|96187,Stadelhofen,BY|96188,Stettfeld,BY|96190,Untermerzbach,BY|96191,Viereth-Trunstadt,BY|96193,Wachenroth,BY|96194,Walsdorf,BY|96196,Wattendorf,BY|96197,Wonsees,BY|96199,Zapfendorf,BY|96215,Lichtenfels,BY|96224,Burgkunstadt,BY|96231,Bad Staffelstein,BY|96237,Ebersdorf,BY|96242,Sonnefeld,BY|96247,Michelau,BY|96250,Ebensfeld,BY|96253,Untersiemau,BY|96257,Marktgraitz,BY|96260,Weismain,BY|96264,Altenkunstadt,BY|96268,Mitwitz,BY|96269,Großheirath,BY|96271,Grub,BY|96272,Hochstadt,BY|96274,Itzgrund,BY|96275,Marktzeuln,BY|96277,Schneckenlohe,BY|96279,Weidhausen,BY|96317,Kaltbuch,BY|96328,Küps,BY|96332,Pressig,BY|96337,Ludwigsstadt,BY|96342,Stockheim,BY|96346,Wallenfels,BY|96349,Mauthaus,BY|96352,Wilhelmsthal,BY|96355,Tettau,BY|96358,Kohlmühle,BY|96361,Steinbach,BY|96364,Marktrodach,BY|96365,Nordhalben,BY|96367,Tschirn,BY|96369,Weißenbrunn,BY|96450,Coburg,BY|96465,Neustadt,BY|96472,Rödental,BY|96476,Bad Rodach,BY|96479,Weitramsdorf,BY|96482,Ahorn,BY|96484,Meeder,BY|96486,Lautertal,BY|96487,Dörfles-Esbach,BY|96489,Niederfüllbach,BY|96515,Heinersdorf,TH|96523,Eschenthal,TH|96524,Föritz,TH|96528,Bachfeld,TH|96529,Mengersgereuth-Hämmern,TH|97070,Würzburg,BY|97072,Würzburg,BY|97074,Würzburg,BY|97076,Würzburg,BY|97078,Würzburg,BY|97080,Würzburg,BY|97082,Würzburg,BY|97084,Würzburg,BY|97199,Ochsenfurt,BY|97204,Höchberg,BY|97209,Veitshöchheim,BY|97215,Simmershofen,BY|97218,Gerbrunn,BY|97222,Rimpar,BY|97225,Zellingen,BY|97228,Rottendorf,BY|97230,Estenfeld,BY|97232,Giebelstadt,BY|97234,Reichenberg,BY|97236,Randersacker,BY|97237,Altertheim,BY|97239,Aub,BY|97241,Bergtheim,BY|97243,Bieberehren,BY|97244,Bütthard,BY|97246,Eibelstadt,BY|97247,Eisenheim,BY|97249,Eisingen,BY|97250,Erlabrunn,BY|97252,Frickenhausen,BY|97253,Gaukönigshofen,BY|97255,Gelchsheim,BY|97256,Geroldshausen,BY|97258,Gollhofen,BY|97259,Greußenheim,BY|97261,Güntersleben,BY|97262,Hausen,BY|97264,Helmstadt,BY|97265,Hettstadt,BY|97267,Himmelstadt,BY|97268,Kirchheim,BY|97270,Kist,BY|97271,Kleinrinderfeld,BY|97273,Kürnach,BY|97274,Leinach,BY|97276,Margetshöchheim,BY|97277,Neubrunn,BY|97279,Prosselsheim,BY|97280,Remlingen,BY|97282,Retzstadt,BY|97283,Riedenheim,BY|97285,Röttingen,BY|97286,Sommerhausen,BY|97288,Theilheim,BY|97289,Thüngen,BY|97291,Thüngersheim,BY|97292,Holzkirchen,BY|97294,Unterpleichfeld,BY|97295,Waldbrunn,BY|97297,Waldbüttelbrunn,BY|97299,Zell,BY|97318,Biebelried,BY|97320,Albertshofen,BY|97332,Volkach,BY|97334,Nordheim,BY|97337,Dettelbach,BY|97340,Marktbreit,BY|97342,Marktsteft,BY|97346,Iphofen,BY|97348,Markt Einersheim,BY|97350,Mainbernheim,BY|97353,Wiesentheid,BY|97355,Abtswind,BY|97357,Prichsenstadt,BY|97359,Münsterschwarzach Abtei,BY|97421,Schweinfurt,BY|97422,Schweinfurt,BY|97424,Schweinfurt,BY|97437,Haßfurt,BY|97440,Werneck,BY|97447,Frankenwinheim,BY|97450,Arnstein,BY|97453,Schonungen,BY|97456,Dittelbrunn,BY|97461,Hofheim,BY|97464,Niederwerrn,BY|97469,Gochsheim,BY|97475,Zeil,BY|97478,Knetzgau,BY|97483,Eltmann,BY|97486,Klaubmühle,BY|97488,Stadtlauringen,BY|97490,Poppenhausen,BY|97491,Aidhausen,BY|97493,Bergrheinfeld,BY|97494,Bundorf,BY|97496,Burgpreppach,BY|97497,Dingolshausen,BY|97499,Donnersdorf,BY|97500,Ebelsbach,BY|97502,Euerbach,BY|97503,Gädheim,BY|97505,Geldersheim,BY|97506,Grafenrheinfeld,BY|97508,Grettstadt,BY|97509,Kloster St Ludwig,BY|97511,Lülsfeld,BY|97513,Michelau,BY|97514,Markertsgrün,BY|97516,Oberschwarzach,BY|97517,Rannungen,BY|97519,Riedbach,BY|97520,Röthlein,BY|97522,Sand,BY|97523,Schwanfeld,BY|97525,Schwebheim,BY|97526,Reichelshof,BY|97528,Sulzdorf,BY|97529,Sulzheim,BY|97531,Theres,BY|97532,Üchtelhausen,BY|97534,Waigolshausen,BY|97535,Wasserlosen,BY|97537,Wipfeld,BY|97539,Wonfurt,BY|97616,Bad Neustadt,BY|97618,Heustreu,BY|97631,Bad Königshofen,BY|97633,Aubstadt,BY|97638,Mellrichstadt,BY|97640,Hendungen,BY|97645,Ostheim,BY|97647,Hausen,BY|97650,Fladungen,BY|97653,Bischofsheim,BY|97654,Bastheim,BY|97656,Oberelsbach,BY|97657,Sandberg,BY|97659,Schönau,BY|97688,Bad Kissingen,BY|97702,Münnerstadt,BY|97705,Burkardroth,BY|97708,Bad Bocklet,BY|97711,Maßbach,BY|97714,Oerlenbach,BY|97717,Aura,BY|97720,Nüdlingen,BY|97723,Oberthulba,BY|97724,Burglauer,BY|97725,Elfershausen,BY|97727,Fuchsstadt,BY|97729,Ramsthal,BY|97737,Gemünden,BY|97753,Karlstadt,BY|97762,Hammelburg,BY|97769,Bad Brückenau,BY|97772,Wildflecken,BY|97773,Aura,BY|97775,Burgsinn,BY|97776,Eußenheim,BY|97778,Fellen,BY|97779,Geroda,BY|97780,Gössenheim,BY|97782,Gräfendorf,BY|97783,Karsbach,BY|97785,Mittelsinn,BY|97786,Motten,BY|97788,Neuendorf,BY|97789,Oberleichtersbach,BY|97791,Obersinn,BY|97792,Riedenberg,BY|97794,Rieneck,BY|97795,Schondra,BY|97797,Wartmannsroth,BY|97799,Zeitlofs,BY|97816,Lohr,BY|97828,Fuchsenmühle,BY|97833,Frammersbach,BY|97834,Birkenfeld,BY|97836,Bischbrunn,BY|97837,Erlenbach,BY|97839,Esselbach,BY|97840,Erlenfurt,BY|97842,Karbach,BY|97843,Neuhütten,BY|97845,Neustadt,BY|97846,Partenstein,BY|97848,Rechtenbach,BY|97849,Roden,BY|97851,Rothenfels,BY|97852,Schleifmühle,BY|97854,Steinfeld,BY|97855,Triefenstein,BY|97857,Urspringen,BY|97859,Wiesthal,BY|97877,Wertheim,BW|97892,Kreuzwertheim,BY|97896,Ebenheiderhof,BY|97900,Külsheim,BW|97901,Altenbuch,BY|97903,Collenberg,BY|97904,Dorfprozelten,BY|97906,Faulbach,BY|97907,Hasloch,BY|97909,Stadtprozelten,BY|97922,Lauda-Königshofen,BW|97941,Tauberbischofsheim,BW|97944,Boxberg,BW|97947,Grünsfeld,BW|97950,Großrinderfeld,BW|97953,Königheim,BW|97956,Werbach,BW|97957,Bowiesen,BW|97959,Assamstadt,BW|97980,Bad Mergentheim,BW|97990,Standorf,BW|97993,Creglingen,BW|97996,Niederstetten,BW|97999,Igersheim,BW|98527,Suhl,TH|98528,Suhl,TH|98529,Albrechts,TH|98530,Dietzhausen,TH|98544,Zella-Mehlis,TH|98547,Christes,TH|98553,Ahlstädt,TH|98554,Benshausen,TH|98559,Gehlberg,TH|98574,Asbach,TH|98587,Altersbach,TH|98590,Georgenzell,TH|98593,Floh-Seligenthal,TH|98596,Trusetal,TH|98597,Breitungen,TH|98599,Brotterode,TH|98617,Bauerbach,TH|98631,Behrungen,TH|98634,Aschenhausen,TH|98639,Metzels,TH|98646,Adelhausen,TH|98660,Beinerstadt,TH|98663,Bad Colberg-Heldburg,TH|98666,Biberau,TH|98667,Gießübel,TH|98669,Veilsdorf,TH|98673,Bockstadt,TH|98678,Hirschendorf,TH|98693,Bücheloh,TH|98701,Allersdorf,TH|98704,Gräfinau-Angstedt,TH|98708,Gehren,TH|98711,Frauenwald,TH|98714,Stützerbach,TH|98716,Elgersburg,TH|98724,Ernstthal,TH|98739,Lichte,TH|98743,Buchbach,TH|98744,Cursdorf,TH|98746,Goldisthal,TH|98749,Friedrichshöhe,TH|99084,Erfurt,TH|99085,Erfurt,TH|99086,Erfurt,TH|99087,Erfurt,TH|99089,Erfurt,TH|99091,Erfurt,TH|99092,Erfurt,TH|99094,Erfurt,TH|99096,Erfurt,TH|99097,Erfurt,TH|99098,Erfurt,TH|99099,Erfurt,TH|99100,Alach,TH|99102,Egstedt a Steiger,TH|99189,Andisleben,TH|99192,Apfelstädt,TH|99195,Alperstedt,TH|99198,Azmannsdorf,TH|99310,Alkersleben,TH|99326,Behringen,TH|99330,Crawinkel,TH|99334,Elleben,TH|99338,Angelroda,TH|99423,Weimar,TH|99425,Weimar,TH|99427,Weimar,TH|99428,Bechstedtstraß,TH|99438,Bad Berka,TH|99439,Ballstedt,TH|99441,Döbritschen,TH|99444,Blankenhain,TH|99448,Hohenfelden,TH|99510,Apolda,TH|99518,Auerstedt,TH|99610,Frohndorf,TH|99625,Battgendorf,TH|99628,Buttstädt,TH|99631,Günstedt,TH|99634,Gangloffsömmern,TH|99636,Ostramondra,TH|99638,Büchel,TH|99706,Badra,TH|99713,Abtsbessingen,TH|99718,Bliederstedt,TH|99734,Nordhausen,TH|99735,Bielen,TH|99752,Bleicherode,TH|99755,Ellrich,TH|99759,Elende,TH|99762,Buchholz,TH|99765,Auleben,TH|99768,Appenrode,TH|99817,Eisenach,TH|99819,Beuernfeld,TH|99826,Berka v d Hainich,TH|99830,Falken,TH|99831,Creuzburg,TH|99834,Gerstungen,TH|99837,Berka,TH|99842,Ruhla,TH|99843,Kittelsthal,TH|99846,Seebach,TH|99848,Hastrungsfeld-Burla,TH|99867,Gotha,TH|99869,Ballstädt,TH|99880,Aspach,TH|99885,Luisenthal,TH|99887,Catterfeld,TH|99891,Fischbach,TH|99894,Ernstroda,TH|99897,Tambach-Dietharz,TH|99898,Engelsbach,TH|99947,Bad Langensalza,TH|99955,Bad Tennstedt,TH|99958,Aschara,TH|99974,Ammern,TH|99976,Beberstedt,TH|99986,Flarchheim,TH|99988,Diedorf,TH|99991,Altengottern,TH|99994,Hohenbergen,TH|99996,Großmehlra,TH|99998,Körner,TH";
const PLZ_DB=(()=>{const p={},o={};PLZ_RAW.split("|").forEach(e=>{const[z,n,b]=e.split(",");p[z]={ort:n,bl:b};const k=n.toLowerCase();if(!o[k])o[k]=[];o[k].push({plz:z,ort:n,bl:b})});return{byPlz:p,byOrt:o,allOrts:Object.keys(o).sort()}})();
const isK15=o=>o?KAPP15.has(o.toLowerCase().trim()):false;
const T={de:{haupt:"Rendite",kredit:"Kredit",miete:"Miete",sanier:"Sanierung",bundesland:"Bundesland",kaufpreis:"Kaufpreis",flaeche:"Wohnfläche",preisQm:"Preis/m²",kaltmiete:"Kaltmiete (mtl.)",nichtUml:"Nicht umlagef.",leerstand:"Leerstand",eigenkapital:"Eigenkapital",zinssatz:"Zinssatz",tilgung:"Tilgung",zinsbindung:"Zinsbindung",grEst:"Grunderwerbsteuer",notar:"Notar & Grundbuch",makler:"Maklerprovision",steuersatz:"Steuersatz",afa:"AfA-Satz",grundAnteil:"Grundstücksanteil",gebAnteil:"Gebäudeanteil",wertP:"Wertsteigerung",jahre:"Analysezeitraum",sonder:"Garage/Stellplatz",plz:"PLZ",ort:"Ort",eingabe:"Eingabe",ergebnis:"Ergebnis",bruttoR:"Bruttorendite",nettoR:"Nettorendite",rate:"Rate/Mon.",cashflow:"Cashflow/Mon.",laufzeit:"Kreditlaufzeit",nbk:"Kaufnebenkosten",darlehen:"Darlehen",steuerErs:"Steuerersparnis",risk:"Risikolevel",niedrig:"Niedrig",mittel:"Mittel",hoch:"Hoch",check:"Schnellcheck",jPl:"Jahren",pJ:"Ø/Jahr",iwert:"Immobilienwert",gut:"Gut",ok:"Okay",krit:"Kritisch",nK:"nach Kosten",pos:"Positiv",zus:"Zuschuss nötig",oL:"Objekt & Lage",fin:"Finanzierung",stNk:"Nebenkosten & Steuer",wZ:"Wertsteigerung & Zeitraum",vgl:"Vergleichsmiete",lDat:"Letzte Erhöhung",lMiet:"Miete damals",kapp:"Kappungsgrenze",ang:"Angespannter Markt",std:"Standardmarkt",nE:"Nächste Mieterhöhung",mxE:"Max. Erhöhung",nM:"Neue Miete max.",jM:"Jetzt möglich",ab:"Ab",keE:"Keine Erhöhungen",mPl:"Mieterhöhungsplan",dat:"Datum",akt:"Aktuell",erh:"Erhöhung",sta:"Status",foe:"Förderung",amo:"Amortisation",eKl:"Energieklasse",vor:"Vorher",nac:"Nachher",esp:"Einsparung",co2:"CO₂-Reduktion",tPl:"Tilgungsplan",bel:"Beleihungsauslauf",rest:"Restschuld n. ZB",gZin:"Gesamtzinsen",gAuf:"Gesamtaufwand",gas:"Erdgas",oel:"Heizöl",wp:"Wärmepumpe",pel:"Pellets",fw:"Fernwärme",koh:"Kohle",str:"Strom",alt:"Über 20 J.",mitt:"10–20 J.",neu:"Unter 10 J.",mR:"Mietrecht",sBJ:"Baujahr",sHTyp:"Heizungstyp",sHAlt:"Heizung Alter",sPers:"Personen",sWfl:"Wohnfläche",sFenStd:"Standardfenster",sFenXL:"Extra-groß (>3m²)",sFenHST:"Hebeschiebetüren",sAnbau:"Anbausituation",sFasFl:"Fassadenfläche",sDaFl:"Dachfläche",sDaForm:"Dachform",sLeist:"Leistung",sKap:"Kapazität",sKeFl:"Kellerfläche",sOgFl:"Geschossdecke",sStrPr:"Strompreis",sHkos:"Heizkosten",sFqAvg:"Förderquote Ø",sJEsp:"Jährl. Ersparnis",sCO2R:"CO₂-Reduktion",sEnerEsp:"Energieeinsparung",sGesK:"Gesamtkosten Sanierung",sNetK:"Netto",sAmoR:"Amortisationsrechnung",sAmoSub:"Nettokosten ÷ jährl. Ersparnis",sMassDet:"Maßnahmen im Detail",sGesamt:"Gesamt",anbFrei:"Freistehend",anbDoppel:"Doppelhaus",anbMittel:"Mittelhaus",dchSattel:"Satteldach",dchFlach:"Flachdach",dchWalm:"Walmdach",sGebData:"Gebäudedaten",sEnergie:"Energiepreise",sStruktur:"Gebäudestruktur",sMassnahmen:"Maßnahmen auswählen",kennzahlen:"📈 Analyse & Kennzahlen",cfOhneSt:"CF/Mon. ohne Steuer",cfMitSt:"CF/Mon. mit Steuervorteil",cfBasis:"Miete − Kosten − Rate",cfMitSub:"inkl. AfA-Steuerersparnis",brGreen:"Solide Bruttorendite",brYellow:"Akzeptabel",brRed:"Unter Markt",brGreenTip:"Marktüblich ≥ 5 %. Guter Ausgangspunkt für positive Nettorendite.",brYellowTip:"Ausreichend, aber laufende Kosten schmälern die Nettomarge spürbar.",brRedTip:"Kaufpreis, Miete oder Nebenkosten prüfen. Unter 4 % schwer tragfähig.",nrGreen:"Attraktiv nach Kosten",nrYellow:"Laufende Kosten gedeckt",nrRed:"Kostenrisiko",nrGreenTip:"Alle laufenden Kosten eingerechnet. Solide Rendite.",nrYellowTip:"Deckt Kosten, aber wenig Puffer bei Leerstand oder Reparaturen.",nrRedTip:"Immobilie erwirtschaftet laufende Kosten kaum. Hohes Risiko.",cfOGreen:"Immobilie trägt sich",cfOYellow:"Knapp ausgeglichen",cfORed:"Monatlicher Zuschuss",cfOGreenTip:"Ohne jeglichen Steuervorteil positiv. Beste Ausgangslage.",cfOYellowTip:"Fast ausgeglichen. Leerstand von 1–2 Monaten kann bereits zum Problem werden.",cfORedTip:"Monatlicher Eigenaufwand nötig. Liquide Reserven einplanen — mind. 6 Monatsbeträge.",cfMGreen:"Positiv mit Steuervorteil",cfMYellow:"Knapp mit Steuerentlastung",cfMRed:"Negativ auch mit Steuer",cfMGreenTip:"Gut — aber nur wenn ausreichend Einkommensteuer gezahlt wird.",cfMYellowTip:"Nur mit vollem Steuervorteil knapp positiv. Steuerlast langfristig sicherstellen.",cfMRedTip:"Selbst nach AfA und Zinsabzug negativ. Stellschrauben: Kaufpreis, Mietansatz, EK-Quote.",belGreen:"Konservativ finanziert",belYellow:"Marktüblich",belRed:"Hohe Fremdfinanzierung",belGreenTip:"Beste Zinskonditionen. Hohe EK-Quote gibt Puffer bei Wertverlust.",belYellowTip:"Typisch bei Kapitalanlegern. Zinsaufschlag möglich.",belRedTip:"Bonität und Einkommen besonders relevant. Banken können Konditionen verschlechtern.",lzGreen:"Kurze Laufzeit",lzYellow:"Mittlere Laufzeit",lzRed:"Sehr lange Laufzeit",lzInf:"Wird nie getilgt",lzGreenTip:"Schnell schuldenfrei. Günstig für Kapitalbildung und spätere Flexibilität.",lzYellowTip:"Planbar. Nach Zinsbindungsende auf Anschlusskonditionen achten.",lzRedTip:"Lange Bindung erhöht Zinsänderungsrisiko erheblich. Tilgung erhöhen empfohlen.",lzInfTip:"Tilgung erhöhen — bei aktuellem Zinssatz wird der Kredit nie vollständig zurückgezahlt.",vermietQ:"Immobilie vermieten?",vermietJa:"Ja, vermietet",vermietNein:"Nein / Eigennutzung",immLeerQ:"Aktuell vermietet?",immLeerJa:"Ja, aktuell vermietet",immLeerNein:"Nein, steht leer",chartTitle1:"Restschuld, Cashflow & Jahresmiete",chartRestschuld:"Restschuld",chartKumCF:"Kum. Cashflow",chartJahresmiete:"Jahresmiete",chartZinsbind:"Zinsbindung",chartTitle2:"Cashflow-Verlauf / Monat",chartCFOhne:"CF ohne Steuervorteil",chartCFMit:"CF mit Steuervorteil",chartDiff:"Differenz = Steuervorteil",chartHoverKumCF:"Kum. CF",chartHoverJahresmiete:"Jahresmiete",chartHoverCFOhne:"CF ohne Steuer",chartHoverCFMit:"CF mit Steuer",chartHoverSteuervorteil:"Steuervorteil",chartDisclamer:"⚠️ Steuervorteil setzt ausreichend Einkommensteuer voraus. Steuerberater konsultieren.",tblTitle:"Jahresentwicklung",tblJahresmiete:"Jahresmiete",tblCFOhne:"CF ohne St.",tblCFMit:"CF mit St.",tblSumme:"SUMME",detTitle:"Verkaufsszenario nach",detJahren:"Jahren",detSub:"Was bleibt, wenn die Immobilie nach dem Analysezeitraum verkauft wird?",detErtraege:"ERTRÄGE",detErloes:"Erlös aus Verkauf",detCumCFOhne:"Kum. CF ohne Steuervorteil",detCumSteuer:"Kum. Steuerersparnis",detSteuerHinweis:"Setzt ausreichend Einkommensteuer voraus",detAufwand:"AUFWENDUNGEN",detSumme:"Summe",detSaldoOhne:"Gesamtsaldo ohne Steuervorteil",detSaldoMit:"Gesamtsaldo mit Steuervorteil",detEKR:"EK-Rendite",detSteuerVoraus:"Setzt ausreichende Einkommensteuer voraus",detInfo:"Steuervorteil = Steuerersparnis durch Zinsabzug, AfA und nicht umlagefähige Kosten × Steuersatz. Nur relevant wenn ausreichend Einkommensteuer gezahlt wird.",saldoOhne:"Saldo ohne Steuer",saldoMit:"Saldo mit Steuer",sanTip1:"Reihenfolge: Zuerst Gebäudehülle (Fenster, Dach, Fassade), dann Heizung.",sanTip2:"Energieberater beauftragen: iSFP-Bonus +5% Förderung. Beratung 50% bezuschusst.",sanTip3:"BAFA-/KfW-Antrag IMMER VOR Auftragsvergabe stellen!",sanTip4:"GEG § 72: Heizungen >30 J. austauschen. § 71: 65% erneuerbare Energie.",sanTip5:"§ 35c EStG: 20% Sanierungskosten absetzbar über 3 J. (max. 40.000€).",sanTip6:"Hydraulischer Abgleich: KfW-Pflicht, senkt Heizkosten 5–15%.",sanTip7:"PV + Batteriespeicher: Eigenverbrauch ~70%. Ideal für E-Auto, Wärmepumpe.",sBerat:"Beratung",ertraege:"ERTRÄGE",aufwend:"AUFWENDUNGEN",gSaldoOhne:"GESAMTSALDO OHNE STEUERVORTEIL",gSaldoMit:"GESAMTSALDO MIT STEUERVORTEIL",pdfExport:"Als PDF exportieren",rechtlGrundlagen:"Rechtliche Grundlagen",sondTilgLabel:"Sondertilgung",vereinbSatz:"Vereinbarter Satz",entspricht:"Entspricht",stdSond:"Standard: 5% des Darlehensbetrags (bei den meisten Banken frei vereinbar)",neueLaufzeit:"Neue Laufzeit",zinsenGespart:"Zinsen gespart",statt:"statt",effekt:"Effekt bei",steuerNeutral:"Steuerlich neutral ab Jahr",steuerNeutralSub:"(Steuerersparnis deckt Nebenkosten)",positivSaldo:"Positiver Gesamtsaldo",nachJahrenVerk:"nach {n} Jahren bei Verkauf",zins:"Zins",tilgK:"Tilg.",belCond90:"⚠️ >90% - Zinszuschlag",belCond80:"🟡 80-90% - normale Konditionen",belCondOk:"✅ <80% - beste Konditionen",markt:"Markt",riskShow:"▼ Risikofaktoren anzeigen",riskHide:"▲ Faktoren ausblenden",rechtsHinweis:"Diese Angaben sind keine Rechtsberatung. Bei konkreten Fällen Steuerberater/Rechtsanwalt konsultieren.",analyseZr:"Analysezeitraum",vercomp:"Vergleichsmiete-Grenze erreicht",sanMassN1:"Fenstertausch",sanMassN2:"Fassade dämmen",sanMassN3:"Heizung erneuern",sanMassN4:"Dach erneuern",sanMassN5:"Eingangstür",sanMassN6:"Photovoltaik",sanMassN7:"Kellerdecke dämmen",sanMassN8:"Oberste Geschossdecke",sanMassN9:"Batteriespeicher",sanMassN10:"Wohnraumlüftung",sHkJahr:"Heizkosten/Jahr",sSkJahr:"Stromkosten/Jahr",sPreisstieg:"Energiepreis-Steigerung",sAutoCalc:"Auto",sPS0:"0 %/Jahr (konstant)",sPS1:"+1 %/Jahr",sPS2:"+2 %/Jahr (Prognose)",sPS3:"+3 %/Jahr",sPS5:"+5 %/Jahr (konservativ)",sCapHin:"BAFA/KfW-Cap angewandt",tierS:"Standard",tierG:"Gehoben",tierM:"Premium",sTierFenS:"Kunststoff",sTierFenG:"Alu-Kunstst.",sTierFenM:"Holz-Alu+App",sTierFasS:"10cm Dämmung",sTierFasG:"16cm höherwert.",sTierFasM:"20cm Öko-Hanf",sTierHzS:"Heizung+Pumpen",sTierHzG:"+Heizkörper+Steuer.",sTierHzM:"+Fußbodenh.+App",sTierDaS:"Neueindeckung+Dämm.",sTierDaG:"+Unterschicht+Spengl.",sTierDaM:"Neuer Dachstuhl",sTierTuS:"Standard-Sicherheit",sTierTuG:"Hochwertig",sTierTuM:"Premium+Fingerprint",sTierPvS:"Aufdach, Einspeisung",sTierPvG:"Indach+Energiemgmt",sTierPvM:"Solar-Dachziegel",sTierLuS:"Basis-Lüftung",sTierLuG:"Bessere Filter",sTierLuM:"Premium+Steuerung",sSrcBafa:"BAFA BEG EM (§ 89 GEG)",sSrcHz:"BAFA BEG EM + Heizungstausch-Bonus",sSrcPv:"KfW 270 (zinsgünstig, EEG 2023)",sSrcBat:"Landesförderung (regional)",sondTilgSub:"Jährliche Extra-Zahlung zur Verkürzung der Laufzeit (§ 500 BGB)",adv1:"Brutto-Netto-Schere > 2 % - Kostenstruktur prüfen: Nicht-umlagefähige Kosten oder Leerstand drücken die Nettorendite stark.",adv2:"Vervielfältiger > 30 - Kaufpreis entspricht mehr als 30 Jahreskaltmieten. Amortisation durch Mieteinnahmen allein dauert sehr lange.",adv3:"Nettorendite unter Finanzierungszins - Negativer Leverage-Effekt: Fremdkapital kostet mehr als es einbringt.",adv4:"Spitzensteuersatz > 42 % - AfA und Zinsabzug haben maximale Steuerwirkung. Steuerstruktur mit Steuerberater optimieren.",adv5:"Grundstücksanteil > 40 % - Hoher Anteil reduziert die AfA-Bemessungsgrundlage. Kaufpreisaufteilung notwendig.",adv6:"Leerstand > 5 % & negativer Cashflow - Liquiditätsreserve von mind. 6 Monatsmieten empfohlen.",adv7:"Anschlussfinanzierung > 60 % des Darlehens - Hohes Zinsänderungsrisiko nach Zinsbindung. Forward-Darlehen prüfen.",adv8:"Zinsbindung < 10 Jahre & Zins > 3,5 % - Anschlussrisiko erhöht. Mind. 10 Jahre Zinsbindung empfohlen.",adv9:"Tilgung < 2 % - Sehr geringe Tilgung. Auf mind. 2 % anheben, um Laufzeit zu verkürzen.",adv10:"Sondertilgung nicht genutzt - Jährliche Sondertilgung würde Laufzeit und Gesamtzinsen erheblich reduzieren.",adv11:"Beleihungsauslauf 80-90 % - Mit mehr Eigenkapital wären bessere Zinskonditionen möglich.",adv12:"Miete > 15 % unter Vergleichsmiete - Schrittweise Angleichung möglich. Kappungsgrenze noch nicht ausgeschöpft.",adv13:"Letzte Erhöhung > 3 Jahre - Kappungsfenster vollständig zurückgesetzt. Maximaler Spielraum für Erhöhung verfügbar.",adv14:"Kappungsgrenze erreicht, Vergleichsmiete deutlich höher - Erst nach erneutem Ablauf des 3-Jahres-Fensters wieder voller Spielraum.",adv15:"Angespannter Markt & Miete nahe Vergleichsmiete - § 559 BGB Modernisierungsmieterhöhung als Alternative prüfen.",adv16:"Amortisation > 20 Jahre - KfW-Kredit (z.B. 261) mit Zinsvorteil kann Amortisationsdauer erheblich verkürzen.",adv17:"Energieklasse nach Sanierung noch unter C - Unter Klasse C droht ab 2033 ein EU-Vermietungsverbot (geplante EED-Umsetzung).",adv18:"Heizungstausch ohne Dämmung - Wärmepumpe benötigt gedämmte Gebäudehülle. Effizienz stark eingeschränkt ohne Fassaden-/Dachdämmung.",advTitle:"💡 Analyse",datastand:"Datenstand",garageKauf:"Garage/Stellplatz",sonderUml:"Sonderumlage",renovierung:"Renovierungskosten",renovSofort:"✅ Unter 15%-Grenze — sofort als Werbungskosten absetzbar (§ 6 Abs. 1 Nr. 1a EStG).",renovAktiv:"⚠️ Über 15%-Grenze — aktivierungspflichtig, kein Sofortabzug. Wird über AfA abgeschrieben.",renovEigennutz:"Bei Eigennutzung steuerlich nicht absetzbar.",renovGrenzHinw:"15%-Grenze des Gebäude-Kaufpreises",stCheck:"Selbstträger-Check",stZielKP:"Ziel-Kaufpreis (CF\u00a0=\u00a00)",stSelbstAb:"Selbstträger ab",stOhneStAkt:"Ohne Steuer\u00b7bei aktuellem Kaufpreis",stSofort:"Sofort",stAusserhalb:"Außerhalb",stCFPositiv:"CF positiv ab Tag\u00a01",stMietSteig:"Mietsteigerung",stVerhandlZiel:"Verhandlungsziel",stIstKPPuffer:"unter Ist-KP\u00a0—\u00a0Puffer",stMitStVor:"Mit Steuervorteil",stUnterZiel:"unter Ziel",stHero1:"Das Objekt trägt sich selbst\u00a0— Cashflow ist positiv, ohne jeden Steuervorteil. Perfekter Ausgangspunkt.",stHero2:"Mit Steuervorteil selbsttragend ({cf}/Mon.). Ohne Steuer fehlen noch {diff}/Mon.\u00a0— kleines Puffer-Risiko.",stHero3:"Verhandle den KP um {diff} ({pct}) auf {kp} herunter\u00a0— dann trägt das Objekt sich selbst, ohne jeden Monat zuzuzahlen.",stHero4a:"Erst ab Jahr {j} selbsttragend (Mietsteigerungen). Sofort selbsttragend ab: {kp}.",stHero4b:"Trägt sich zum aktuellen Preis nicht selbst. Ziel-KP: {kp} (−{diff})."},
en:{haupt:"Return",kredit:"Loan",miete:"Rent",sanier:"Renovation",bundesland:"State",kaufpreis:"Purchase price",flaeche:"Living area",preisQm:"Price/m²",kaltmiete:"Cold rent (mo.)",nichtUml:"Non-recoverable",leerstand:"Vacancy",eigenkapital:"Equity",zinssatz:"Interest rate",tilgung:"Repayment",zinsbindung:"Fixed rate period",grEst:"Transfer tax",notar:"Notary",makler:"Broker fee",steuersatz:"Tax rate",afa:"Depreciation",grundAnteil:"Land portion",gebAnteil:"Building portion",wertP:"Appreciation",jahre:"Analysis period",sonder:"Garage/parking",plz:"Postal code",ort:"City",eingabe:"Input",ergebnis:"Result",bruttoR:"Gross yield",nettoR:"Net yield",rate:"Rate/mo.",cashflow:"Cashflow/mo.",laufzeit:"Loan term",nbk:"Purchase costs",darlehen:"Loan",steuerErs:"Tax savings",risk:"Risk level",niedrig:"Low",mittel:"Medium",hoch:"High",check:"Quick check",jPl:"years",pJ:"Ø/year",iwert:"Property value",gut:"Good",ok:"Okay",krit:"Critical",nK:"after costs",pos:"Positive",zus:"Subsidy needed",oL:"Property & Location",fin:"Financing",stNk:"Costs & Taxes",wZ:"Appreciation & Period",vgl:"Comparable rent",lDat:"Last increase",lMiet:"Rent then",kapp:"Rent cap",ang:"Tight market",std:"Standard market",nE:"Next increase",mxE:"Max. increase",nM:"Max. new rent",jM:"Possible now",ab:"From",keE:"No increases",mPl:"Rent increase plan",dat:"Date",akt:"Current",erh:"Increase",sta:"Status",foe:"Subsidy",amo:"Payback",eKl:"Energy class",vor:"Before",nac:"After",esp:"Savings",co2:"CO₂ reduction",tPl:"Amortization",bel:"Loan-to-value",rest:"Remaining debt",gZin:"Total interest",gAuf:"Total expense",gas:"Natural gas",oel:"Heating oil",wp:"Heat pump",pel:"Pellets",fw:"District heat",koh:"Coal",str:"Electric",alt:"Over 20 yr",mitt:"10–20 yr",neu:"Under 10 yr",mR:"Tenancy law",sBJ:"Year built",sHTyp:"Heating type",sHAlt:"Heating age",sPers:"Persons",sWfl:"Living area",sFenStd:"Standard windows",sFenXL:"Extra-large (>3m²)",sFenHST:"Lift-slide doors",sAnbau:"Attached situation",sFasFl:"Facade area",sDaFl:"Roof area",sDaForm:"Roof shape",sLeist:"Power",sKap:"Capacity",sKeFl:"Basement area",sOgFl:"Floor ceiling",sStrPr:"Electricity price",sHkos:"Heating costs",sFqAvg:"Avg. subsidy quota",sJEsp:"Annual savings",sCO2R:"CO₂ reduction",sEnerEsp:"Energy savings",sGesK:"Total renovation cost",sNetK:"Net",sAmoR:"Payback calculation",sAmoSub:"Net cost ÷ annual savings",sMassDet:"Measures in detail",sGesamt:"Total",anbFrei:"Detached",anbDoppel:"Semi-detached",anbMittel:"Mid-terrace",dchSattel:"Gable roof",dchFlach:"Flat roof",dchWalm:"Hip roof",sGebData:"Building data",sEnergie:"Energy prices",sStruktur:"Building structure",sMassnahmen:"Select measures",kennzahlen:"📈 Analysis & Key Metrics",cfOhneSt:"CF/Mo. without Tax Benefit",cfMitSt:"CF/Mo. with Tax Benefit",cfBasis:"Rent − Costs − Payment",cfMitSub:"incl. depreciation tax saving",brGreen:"Solid gross yield",brYellow:"Acceptable",brRed:"Below market",brGreenTip:"Market standard ≥ 5%. Good starting point for positive net yield.",brYellowTip:"Sufficient, but running costs will noticeably reduce net margin.",brRedTip:"Check purchase price, rent or ancillary costs. Below 4% hard to sustain.",nrGreen:"Attractive after costs",nrYellow:"Running costs covered",nrRed:"Cost risk",nrGreenTip:"All running costs included. Solid return.",nrYellowTip:"Covers costs, but little buffer for vacancy or repairs.",nrRedTip:"Property barely covers running costs. High risk.",cfOGreen:"Property self-sustaining",cfOYellow:"Barely balanced",cfORed:"Monthly top-up needed",cfOGreenTip:"Positive without any tax benefit. Best case.",cfOYellowTip:"Nearly balanced. 1-2 months vacancy can already become a problem.",cfORedTip:"Monthly personal contribution needed. Plan liquid reserves — at least 6 months.",cfMGreen:"Positive with tax benefit",cfMYellow:"Narrowly positive",cfMRed:"Negative even with tax",cfMGreenTip:"Good — but only if sufficient income tax is paid.",cfMYellowTip:"Narrowly positive only with full tax benefit.",cfMRedTip:"Negative even after depreciation and interest deduction.",belGreen:"Conservatively financed",belYellow:"Market standard",belRed:"High leverage",belGreenTip:"Best interest rates. High equity ratio provides buffer against value decline.",belYellowTip:"Typical for investors. Possible interest rate surcharge.",belRedTip:"Creditworthiness and income particularly relevant.",lzGreen:"Short term",lzYellow:"Medium term",lzRed:"Very long term",lzInf:"Never repaid",lzGreenTip:"Debt-free quickly. Good for capital building and future flexibility.",lzYellowTip:"Manageable. Monitor refinancing conditions after fixed-rate period.",lzRedTip:"Long commitment increases interest rate change risk. Increase repayment.",lzInfTip:"Increase repayment — at current rate the loan is never fully repaid.",vermietQ:"Rent out property?",vermietJa:"Yes, rented out",vermietNein:"No / Owner-occupied",immLeerQ:"Currently rented?",immLeerJa:"Yes, currently rented",immLeerNein:"No, currently vacant",chartTitle1:"Remaining Debt, Cashflow & Annual Rent",chartRestschuld:"Remaining debt",chartKumCF:"Cum. cashflow",chartJahresmiete:"Annual rent",chartZinsbind:"Fixed rate end",chartTitle2:"Monthly Cashflow Over Time",chartCFOhne:"CF without tax benefit",chartCFMit:"CF with tax benefit",chartDiff:"Difference = tax benefit",chartHoverKumCF:"Cum. CF",chartHoverJahresmiete:"Annual rent",chartHoverCFOhne:"CF without tax",chartHoverCFMit:"CF with tax",chartHoverSteuervorteil:"Tax benefit",chartDisclamer:"⚠️ Tax benefit requires sufficient income tax. Consult a tax advisor.",tblTitle:"Annual development",tblJahresmiete:"Annual rent",tblCFOhne:"CF w/o tax",tblCFMit:"CF w/ tax",tblSumme:"TOTAL",detTitle:"Sale scenario after",detJahren:"years",detSub:"What remains if the property is sold after the analysis period?",detErtraege:"INCOME",detErloes:"Sale proceeds",detCumCFOhne:"Cum. CF without tax benefit",detCumSteuer:"Cum. tax savings",detSteuerHinweis:"Requires sufficient income tax",detAufwand:"EXPENSES",detSumme:"Total",detSaldoOhne:"Total balance without tax benefit",detSaldoMit:"Total balance with tax benefit",detEKR:"Equity return",detSteuerVoraus:"Requires sufficient income tax",detInfo:"Tax benefit = tax savings from interest deduction, depreciation and non-recoverable costs × tax rate.",saldoOhne:"Balance w/o tax",saldoMit:"Balance w/ tax",sanTip1:"Order: Envelope first (windows, roof, facade), then heating.",sanTip2:"Hire energy advisor: iSFP bonus +5%. Advisory 50% subsidized.",sanTip3:"BAFA/KfW application BEFORE awarding contracts!",sanTip4:"GEG § 72: Heating >30 yr must be replaced. § 71: 65% renewable.",sanTip5:"§ 35c EStG: 20% deductible over 3 yr (max. €40,000).",sanTip6:"Hydraulic balancing: KfW-required, reduces heating 5–15%.",sanTip7:"PV + Battery: Self-consumption ~70%. Ideal for EV, heat pump.",sBerat:"Advisory",ertraege:"INCOME",aufwend:"EXPENSES",gSaldoOhne:"TOTAL BALANCE WITHOUT TAX BENEFIT",gSaldoMit:"TOTAL BALANCE WITH TAX BENEFIT",pdfExport:"Export as PDF",rechtlGrundlagen:"Legal Basis",sondTilgLabel:"Extra Repayment",vereinbSatz:"Agreed rate",entspricht:"Equals",stdSond:"Standard: 5% of loan amount (freely negotiable at most banks)",neueLaufzeit:"New term",zinsenGespart:"Interest saved",statt:"instead of",effekt:"Effect at",steuerNeutral:"Tax-neutral from year",steuerNeutralSub:"(tax savings cover ancillary costs)",positivSaldo:"Positive total balance",nachJahrenVerk:"after {n} years on sale",zins:"Int.",tilgK:"Rep.",belCond90:"⚠️ >90% - rate surcharge",belCond80:"🟡 80-90% - standard terms",belCondOk:"✅ <80% - best terms",markt:"Market",riskShow:"▼ Show risk factors",riskHide:"▲ Hide factors",rechtsHinweis:"No legal advice. Consult a tax advisor or lawyer for specific cases.",analyseZr:"Analysis period",vercomp:"Reference rent ceiling reached",sanMassN1:"Window replacement",sanMassN2:"Facade insulation",sanMassN3:"Heating renewal",sanMassN4:"Roof renewal",sanMassN5:"Front door",sanMassN6:"Photovoltaics",sanMassN7:"Basement ceiling insulation",sanMassN8:"Top floor ceiling",sanMassN9:"Battery storage",sanMassN10:"Ventilation",sHkJahr:"Heating costs/year",sSkJahr:"Electricity costs/year",sPreisstieg:"Energy price increase",sAutoCalc:"Auto",sPS0:"0 %/year (constant)",sPS1:"+1 %/year",sPS2:"+2 %/year (forecast)",sPS3:"+3 %/year",sPS5:"+5 %/year (conservative)",sCapHin:"BAFA/KfW cap applied",sTierFenS:"PVC frame",sTierFenG:"Alu-composite",sTierFenM:"Wood-alu+app",sTierFasS:"10cm insulation",sTierFasG:"16cm premium",sTierFasM:"20cm eco-hemp",sTierHzS:"Heating+pumps",sTierHzG:"+radiators+ctrl",sTierHzM:"+underfloor+app",sTierDaS:"Re-roofing+insul.",sTierDaG:"+underlay+sheet",sTierDaM:"New roof structure",sTierTuS:"Standard security",sTierTuG:"High quality",sTierTuM:"Premium+fingerprint",sTierPvS:"On-roof, feed-in",sTierPvG:"In-roof+energy mgmt",sTierPvM:"Solar roof tiles",sTierLuS:"Basic ventilation",sTierLuG:"Better filters",sTierLuM:"Premium+control",sSrcBafa:"BAFA BEG EM (§ 89 GEG)",sSrcHz:"BAFA BEG EM + heating bonus",sSrcPv:"KfW 270 (low interest, EEG 2023)",sSrcBat:"State subsidy (regional)",sondTilgSub:"Annual extra repayment to shorten the loan term (§ 500 BGB)",adv1:"Gross-net gap > 2 % - Review cost structure: non-recoverable costs or vacancy are reducing net yield significantly.",adv2:"Multiplier > 30 - Purchase price exceeds 30 annual net rents. Amortisation through rent alone takes very long.",adv3:"Net yield below financing rate - Negative leverage effect: debt costs more than it earns.",adv4:"Top tax rate > 42 % - Depreciation and interest deduction have maximum tax impact. Optimise tax structure with advisor.",adv5:"Land portion > 40 % - High land share reduces depreciable base. Purchase price allocation required.",adv6:"Vacancy > 5 % & negative cashflow - Liquidity reserve of at least 6 monthly rents recommended.",adv7:"Refinancing > 60 % of loan - High interest rate risk after fixed period. Consider forward mortgage.",adv8:"Fixed period < 10 years & rate > 3.5 % - Elevated refinancing risk. At least 10-year fixed period recommended.",adv9:"Repayment < 2 % - Very low repayment. Increase to at least 2 % to shorten term.",adv10:"Extra repayment unused - Annual extra repayments would significantly reduce term and total interest.",adv11:"LTV 80-90 % - Better rate conditions possible with more equity.",adv12:"Rent > 15 % below reference rent - Stepwise increase possible. Rent cap not yet exhausted.",adv13:"Last increase > 3 years ago - 3-year cap window fully reset. Maximum room for rent increase available.",adv14:"Rent cap reached, reference rent much higher - Full room again only after next 3-year window expires.",adv15:"Tight market & rent near reference rent - Check § 559 BGB modernisation rent increase as alternative.",adv16:"Payback > 20 years - KfW loan (e.g. 261) with interest benefit can significantly shorten payback.",adv17:"Energy class after renovation still below C - Below class C: EU rental ban risk from 2033 (planned EED implementation).",adv18:"Heating replaced without insulation - Heat pump needs insulated building envelope. Efficiency severely limited without facade/roof insulation.",advTitle:"💡 Analysis",datastand:"Data status",garageKauf:"Garage/parking",sonderUml:"Special levy",renovierung:"Renovation costs",renovSofort:"✅ Under 15% threshold — immediately deductible as operating costs (§ 6 para. 1 no. 1a EStG).",renovAktiv:"⚠️ Over 15% threshold — must be capitalised, no immediate deduction. Depreciated via AfA.",renovEigennutz:"Owner-occupied: not tax-deductible.",renovGrenzHinw:"15% of building purchase price",stCheck:"Self-Sustaining Check",stZielKP:"Target price (CF\u00a0=\u00a00)",stSelbstAb:"Self-sustaining from",stOhneStAkt:"Without tax benefit\u00b7at current price",stSofort:"Immediately",stAusserhalb:"Outside",stCFPositiv:"CF positive from day\u00a01",stMietSteig:"Rent increase",stVerhandlZiel:"Negotiation target",stIstKPPuffer:"below actual price\u00a0—\u00a0buffer",stMitStVor:"With tax benefit",stUnterZiel:"below target",stHero1:"The property sustains itself\u00a0— cashflow is positive without any tax benefit. Perfect starting point.",stHero2:"With tax benefit already self-sustaining ({cf}/mo.). Without tax: {diff}/mo. gap\u00a0— small buffer risk.",stHero3:"Negotiate the price down by {diff} ({pct}) to {kp}\u00a0— then the property sustains itself without any monthly top-up.",stHero4a:"Self-sustaining only from year {j} onwards (rent increases). Immediately self-sustaining at: {kp}.",stHero4b:"Not self-sustaining at current price. Target price: {kp} (−{diff})."},
tr:{haupt:"Getiri",kredit:"Kredi",miete:"Kira",sanier:"Tadilat",bundesland:"Eyalet",kaufpreis:"Satın Alma Fiyatı",flaeche:"Yaşam Alanı",preisQm:"Fiyat/m²",kaltmiete:"Soğuk Kira (aylık)",nichtUml:"Aktarılamayan",leerstand:"Boşluk",eigenkapital:"Öz Sermaye",zinssatz:"Faiz Oranı",tilgung:"Anapara Ödemesi",zinsbindung:"Sabit Faiz Süresi",grEst:"Tapu Vergisi",notar:"Noter",makler:"Komisyon",steuersatz:"Vergi Oranı",afa:"Amortisman",grundAnteil:"Arsa Payı",gebAnteil:"Bina Payı",wertP:"Değer Artışı",jahre:"Analiz Süresi",sonder:"Garaj/Otopark",plz:"Posta Kodu",ort:"Şehir",eingabe:"Giriş",ergebnis:"Sonuç",bruttoR:"Brüt Getiri",nettoR:"Net Getiri",rate:"Taksit/Ay",cashflow:"Nakit Akışı/Ay",laufzeit:"Kredi Vadesi",nbk:"Satın Alma Giderleri",darlehen:"Kredi",steuerErs:"Vergi Tasarrufu",risk:"Risk Seviyesi",niedrig:"Düşük",mittel:"Orta",hoch:"Yüksek",check:"Hızlı Kontrol",jPl:"yıl sonra",pJ:"Ort./Yıl",iwert:"Gayrimenkul Değeri",gut:"İyi",ok:"Kabul Edilebilir",krit:"Kritik",nK:"giderler sonrası",pos:"Pozitif",zus:"Destek gerekli",oL:"Nesne & Konum",fin:"Finansman",stNk:"Giderler & Vergi",wZ:"Değer Artışı & Süre",vgl:"Karşılaştırma Kirası",lDat:"Son Artış",lMiet:"O zamanki Kira",kapp:"Kira Tavanı",ang:"Gergin Piyasa",std:"Standart Piyasa",nE:"Sonraki Kira Artışı",mxE:"Maks. Artış",nM:"Maks. Yeni Kira",jM:"Şimdi mümkün",ab:"İtibaren",keE:"Artış yok",mPl:"Kira Artış Planı",dat:"Tarih",akt:"Mevcut",erh:"Artış",sta:"Durum",foe:"Teşvik",amo:"Amortisman",eKl:"Enerji Sınıfı",vor:"Önce",nac:"Sonra",esp:"Tasarruf",co2:"CO₂ Azaltma",tPl:"Ödeme Planı",bel:"Kredi/Değer Oranı",rest:"Kalan Borç",gZin:"Toplam Faiz",gAuf:"Toplam Gider",gas:"Doğalgaz",oel:"Fuel Oil",wp:"Isı Pompası",pel:"Pelet",fw:"Uzaktan Isıtma",koh:"Kömür",str:"Elektrik",alt:"20 yıl üstü",mitt:"10–20 yıl",neu:"10 yıl altı",mR:"Kira Hukuku",sBJ:"İnşaat yılı",sHTyp:"Isıtma tipi",sHAlt:"Isıtma yaşı",sPers:"Kişi",sWfl:"Yaşam alanı",sFenStd:"Standart pencereler",sFenXL:"Ekstra büyük (>3m²)",sFenHST:"Kaldır-kaydır kapılar",sAnbau:"Bitişik durum",sFasFl:"Cephe alanı",sDaFl:"Çatı alanı",sDaForm:"Çatı şekli",sLeist:"Güç",sKap:"Kapasite",sKeFl:"Bodrum alanı",sOgFl:"Kat tavanı",sStrPr:"Elektrik fiyatı",sHkos:"Isıtma maliyeti",sFqAvg:"Ort. teşvik kotası",sJEsp:"Yıllık tasarruf",sCO2R:"CO₂ azaltma",sEnerEsp:"Enerji tasarrufu",sGesK:"Toplam tadilat maliyeti",sNetK:"Net",sAmoR:"Geri ödeme hesabı",sAmoSub:"Net maliyet ÷ yıllık tasarruf",sMassDet:"Önlemler detayda",sGesamt:"Toplam",anbFrei:"Müstakil",anbDoppel:"İkiz ev",anbMittel:"Sıra evi",dchSattel:"Beşik çatı",dchFlach:"Düz çatı",dchWalm:"Kırma çatı",sGebData:"Bina verileri",sEnergie:"Enerji fiyatları",sStruktur:"Bina yapısı",sMassnahmen:"Önlem seçin",kennzahlen:"📈 Analiz & Temel Göstergeler",cfOhneSt:"CF/Ay. Vergi Avantajı Hariç",cfMitSt:"CF/Ay. Vergi Avantajı Dahil",cfBasis:"Kira − Maliyetler − Taksit",cfMitSub:"AfA vergi tasarrufu dahil",brGreen:"Sağlam brüt verim",brYellow:"Kabul edilebilir",brRed:"Piyasanın altında",brGreenTip:"Piyasa standardı ≥ %5. Net verim için iyi başlangıç.",brYellowTip:"Yeterli, ancak işletme giderleri net marjı azaltır.",brRedTip:"Fiyat, kira veya yan maliyetleri kontrol edin.",nrGreen:"Maliyetler sonrası cazip",nrYellow:"İşletme maliyetleri karşılandı",nrRed:"Maliyet riski",nrGreenTip:"Tüm işletme maliyetleri dahil. Sağlam getiri.",nrYellowTip:"Maliyetleri karşılar, ancak boşluk için az tampon.",nrRedTip:"Mülk işletme maliyetlerini zar zor karşılıyor.",cfOGreen:"Mülk kendi kendine yeterli",cfOYellow:"Neredeyse dengeli",cfORed:"Aylık ek katkı gerekli",cfOGreenTip:"Vergi avantajı olmaksızın pozitif. En iyi başlangıç.",cfOYellowTip:"Neredeyse dengeli. 1-2 aylık boşluk sorun yaratabilir.",cfORedTip:"Aylık kişisel katkı gerekli. En az 6 aylık likit rezerv planlayın.",cfMGreen:"Vergi avantajıyla pozitif",cfMYellow:"Dar pozitif",cfMRed:"Vergiyle de negatif",cfMGreenTip:"İyi — ama yeterli gelir vergisi ödenmesi şartıyla.",cfMYellowTip:"Yalnızca tam vergi avantajıyla dar pozitif.",cfMRedTip:"AfA ve faiz indirimi sonrası bile negatif.",belGreen:"Muhafazakar finansman",belYellow:"Piyasa standardı",belRed:"Yüksek dış finansman",belGreenTip:"En iyi faiz koşulları. Değer düşüşüne karşı tampon.",belYellowTip:"Yatırımcılar için tipik. Faiz zammı mümkün.",belRedTip:"Kredi notu ve gelir özellikle önemli.",lzGreen:"Kısa vade",lzYellow:"Orta vade",lzRed:"Çok uzun vade",lzInf:"Hiç ödenmedi",lzGreenTip:"Hızlı borçsuz. Sermaye birikimi için iyi.",lzYellowTip:"Yönetilebilir. Sabit oran sonrası koşulları izleyin.",lzRedTip:"Uzun bağlılık faiz riskini artırır. Geri ödemeyi artırın.",lzInfTip:"Geri ödemeyi artırın — mevcut oranda kredi hiç ödenmez.",vermietQ:"Kiralık mı?",vermietJa:"Evet, kirada",vermietNein:"Hayır / Kendi kullanım",immLeerQ:"Şu an kirada mı?",immLeerJa:"Evet, şu an kirada",immLeerNein:"Hayır, boş",chartTitle1:"Kalan Borç, Nakit Akışı & Yıllık Kira",chartRestschuld:"Kalan borç",chartKumCF:"Kümülatif nakit akışı",chartJahresmiete:"Yıllık kira",chartZinsbind:"Sabit faiz sonu",chartTitle2:"Aylık Nakit Akışı Seyri",chartCFOhne:"Vergi avantajı hariç",chartCFMit:"Vergi avantajı dahil",chartDiff:"Fark = vergi avantajı",chartHoverKumCF:"Kümülatif nakit",chartHoverJahresmiete:"Yıllık kira",chartHoverCFOhne:"Vergi hariç nakit",chartHoverCFMit:"Vergi dahil nakit",chartHoverSteuervorteil:"Vergi avantajı",chartDisclamer:"⚠️ Vergi avantajı yeterli gelir vergisi gerektirir. Vergi danışmanına başvurun.",tblTitle:"Yıllık gelişim",tblJahresmiete:"Yıllık kira",tblCFOhne:"Vergi hariç",tblCFMit:"Vergi dahil",tblSumme:"TOPLAM",detTitle:"Satış senaryosu:",detJahren:"yıl sonra",detSub:"Analiz süresi sonunda mülk satılsaydı ne kalırdı?",detErtraege:"GELİRLER",detErloes:"Satış geliri",detCumCFOhne:"Kümülatif nakit (vergi hariç)",detCumSteuer:"Kümülatif vergi tasarrufu",detSteuerHinweis:"Yeterli gelir vergisi ödenmesi gerekir",detAufwand:"GİDERLER",detSumme:"Toplam",detSaldoOhne:"Toplam bakiye (vergi hariç)",detSaldoMit:"Toplam bakiye (vergi dahil)",detEKR:"Özkaynak getirisi",detSteuerVoraus:"Yeterli gelir vergisi gerektirir",detInfo:"Vergi avantajı = faiz indirimi, amortisman ve aktarılamayan maliyetler × vergi oranı.",saldoOhne:"Vergi hariç bakiye",saldoMit:"Vergi dahil bakiye",sanTip1:"Sıra: Önce bina kabuğu (pencere, çatı, cephe), sonra ısıtma.",sanTip2:"Enerji danışmanı: iSFP bonusu +%5. Danışmanlık %50 sübvanse.",sanTip3:"BAFA/KfW başvurusu sözleşmeden ÖNCE yapılmalı!",sanTip4:"GEG § 72: >30 yıllık ısıtmalar değiştirilmeli. § 71: %65 yenilenebilir.",sanTip5:"§ 35c EStG: 3 yılda %20 düşülebilir (maks. 40.000€).",sanTip6:"Hidrolik dengeleme: KfW zorunluluğu, ısıtmayı %5–15 düşürür.",sanTip7:"PV + Batarya: Öz tüketim ~%70. EV ve ısı pompası için ideal.",sBerat:"Danışmanlık",ertraege:"GELİRLER",aufwend:"GİDERLER",gSaldoOhne:"VERGİ AVANTAJI HARİÇ TOPLAM BAKİYE",gSaldoMit:"VERGİ AVANTAJI DAHİL TOPLAM BAKİYE",pdfExport:"PDF olarak dışa aktar",rechtlGrundlagen:"Yasal Dayanak",sondTilgLabel:"Ek Ödeme",vereinbSatz:"Sözleşmeli oran",entspricht:"Karşılık gelir",stdSond:"Standart: kredi tutarının %5'i (çoğu bankada serbestçe kararlaştırılabilir)",neueLaufzeit:"Yeni vade",zinsenGespart:"Faiz tasarrufu",statt:"yerine",effekt:"Etki",steuerNeutral:"Yıldan itibaren vergi nötr",steuerNeutralSub:"(vergi tasarrufu yan maliyetleri karşılar)",positivSaldo:"Pozitif toplam bakiye",nachJahrenVerk:"{n} yıl sonra satışta",zins:"Faiz",tilgK:"Geri öd.",belCond90:"⚠️ >%90 - faiz zammı",belCond80:"🟡 %80-90 - normal koşullar",belCondOk:"✅ <%80 - en iyi koşullar",markt:"Piyasa",riskShow:"▼ Risk faktörlerini göster",riskHide:"▲ Faktörleri gizle",rechtsHinweis:"Bu bilgiler hukuki tavsiye değildir. Somut durumlar için vergi danışmanı veya avukata başvurun.",analyseZr:"Analiz dönemi",vercomp:"Referans kira tavanına ulaşıldı",sanMassN1:"Pencere değişimi",sanMassN2:"Cephe yalıtımı",sanMassN3:"Isıtma yenileme",sanMassN4:"Çatı yenileme",sanMassN5:"Giriş kapısı",sanMassN6:"Fotovoltaik",sanMassN7:"Bodrum tavan yalıtımı",sanMassN8:"Üst kat tavanı",sanMassN9:"Batarya deposu",sanMassN10:"Havalandırma",sHkJahr:"Isıtma maliyeti/yıl",sSkJahr:"Elektrik maliyeti/yıl",sPreisstieg:"Enerji fiyat artışı",sAutoCalc:"Otomatik",sPS0:"%0/yıl (sabit)",sPS1:"+%1/yıl",sPS2:"+%2/yıl (tahmin)",sPS3:"+%3/yıl",sPS5:"+%5/yıl (muhafazakâr)",sCapHin:"BAFA/KfW sınırı uygulandı",tierS:"Standart",tierG:"Gelişmiş",tierM:"Premium",sTierFenS:"PVC çerçeve",sTierFenG:"Alu-kompozit",sTierFenM:"Ahşap-alu+uygulama",sTierFasS:"10cm yalıtım",sTierFasG:"16cm premium",sTierFasM:"20cm eko-kenevir",sTierHzS:"Isıtma+pompalar",sTierHzG:"+radyatörler+kontrol",sTierHzM:"+yerden ısıtma+uygulama",sTierDaS:"Yeniden çatı+yalıtım",sTierDaG:"+alt tabaka+sac",sTierDaM:"Yeni çatı taşıyıcısı",sTierTuS:"Standart güvenlik",sTierTuG:"Yüksek kalite",sTierTuM:"Premium+parmak izi",sTierPvS:"Çatı üstü, besleme",sTierPvG:"Çatı içi+enerji yönt.",sTierPvM:"Güneş çatı kiremidi",sTierLuS:"Temel havalandırma",sTierLuG:"Daha iyi filtreler",sTierLuM:"Premium+kontrol",sSrcBafa:"BAFA BEG EM (§ 89 GEG)",sSrcHz:"BAFA BEG EM + ısıtma bonusu",sSrcPv:"KfW 270 (düşük faiz, EEG 2023)",sSrcBat:"Eyalet desteği (bölgesel)",sondTilgSub:"Kredi vadesini kısaltmak için yıllık ek ödeme (§ 500 BGB)",adv1:"Brüt-net fark > %2 - Maliyet yapısını inceleyin.",adv2:"Çarpan > 30 - Satın alma fiyatı 30 yıllık net kiradan fazla.",adv3:"Net verim finansman faizinin altında - Negatif kaldıraç etkisi.",adv4:"En yüksek vergi oranı > %42 - Amortisman ve faiz indirimi maksimum vergi etkisi yaratır.",adv5:"Arsa payı > %40 - Yüksek arsa payı amortismana tabi tabanı azaltır.",adv6:"Boşluk > %5 & negatif nakit akışı - En az 6 aylık kira tutarında likit rezerv önerilir.",adv7:"Yeniden finansman > Kredinin %60 - Sabit faiz döneminden sonra yüksek faiz riski. Forward kredi inceleyin.",adv8:"Sabit dönem < 10 yıl & faiz > %3,5 - Yeniden finansman riski yüksek. En az 10 yıl sabit dönem önerilir.",adv9:"Geri ödeme < %2 - Çok düşük geri ödeme. Vadeyi kısaltmak için en az %2 ye çıkarın.",adv10:"Ek ödeme kullanılmamış - Yıllık ek ödemeler vadeyi ve toplam faizi önemli ölçüde azaltır.",adv11:"LTV %80-90 - Daha fazla öz sermayeyle daha iyi faiz koşulları mümkün.",adv12:"Kira referans kirasının > %15 altında - Kademeli artış mümkün. Kira tavanı henüz dolmamış.",adv13:"Son artıştan > 3 yıl geçti - 3 yıllık pencere tamamen sıfırlandı. Maksimum artış alanı mevcut.",adv14:"Kira tavanına ulaşıldı, referans kira çok daha yüksek - Bir sonraki 3 yıllık pencere dolana kadar tam alan yok.",adv15:"Gergin piyasa & kira referansa yakın - § 559 BGB modernizasyon kira artışını alternatif olarak inceleyin.",adv16:"Geri ödeme > 20 yıl - KfW kredisi faiz avantajıyla geri ödeme süresini kısaltabilir.",adv17:"Sanasyon sonrası enerji sınıfı hala C nin altında - 2033 ten itibaren AB kiralama yasağı riski.",adv18:"Isıtma değişimi yalıtım olmadan - Isı pompası yalıtımlı bina kabuğu gerektirir.",advTitle:"💡 Analiz",datastand:"Veri tarihi",garageKauf:"Garaj/Otopark",sonderUml:"Özel aidat",renovierung:"Tadilat maliyetleri",renovSofort:"✅ %15 sınırın altında — gider olarak anında düşülebilir.",renovAktiv:"⚠️ %15 sınırın üzerinde — aktifleştirme zorunlu, anında indirim yok.",renovEigennutz:"Kendi kullanımda vergisel indirim yok.",renovGrenzHinw:"Bina KF %15 sınırı",stCheck:"Öz-Yeterlik Kontrolü",stZielKP:"Hedef fiyat (CF\u00a0=\u00a00)",stSelbstAb:"Öz-yeterli itibaren",stOhneStAkt:"Vergisiz\u00b7mevcut fiyata göre",stSofort:"Hemen",stAusserhalb:"Dışında",stCFPositiv:"Gün\u00a01'den itibaren CF pozitif",stMietSteig:"Kira artışı",stVerhandlZiel:"Pazarlık hedefi",stIstKPPuffer:"mevcut fiyatın altında\u00a0—\u00a0tampon",stMitStVor:"Vergi avantajıyla",stUnterZiel:"hedefin altında",stHero1:"Mülk kendi kendini finanse ediyor\u00a0— herhangi bir vergi avantajı olmadan nakit akışı pozitif. Mükemmel başlangıç.",stHero2:"Vergi avantajıyla öz-yeterli ({cf}/ay). Vergisiz {diff}/ay açık\u00a0— küçük tampon riski.",stHero3:"Fiyatı {diff} ({pct}) indirebilirsen {kp}'a düşer\u00a0— mülk aylık katkı olmadan kendini finanse eder.",stHero4a:"Mevcut fiyatta ancak {j}. yıldan itibaren öz-yeterli (kira artışları). Hemen öz-yeterli: {kp}.",stHero4b:"Mevcut fiyatta mülk kendini finanse etmiyor. Hedef fiyat: {kp} (−{diff})."},
zh:{haupt:"收益",kredit:"贷款",miete:"租金",sanier:"翻新",bundesland:"联邦州",kaufpreis:"购买价格",flaeche:"居住面积",preisQm:"每平米价格",kaltmiete:"冷租金(月)",nichtUml:"不可转嫁费用",leerstand:"空置期",eigenkapital:"自有资金",zinssatz:"利率",tilgung:"还款率",zinsbindung:"固定利率期限",grEst:"房产交易税",notar:"公证费",makler:"中介费",steuersatz:"税率",afa:"折旧率",grundAnteil:"土地份额",gebAnteil:"建筑份额",wertP:"增值率",jahre:"分析期限",sonder:"车库/车位",plz:"邮编",ort:"城市",eingabe:"输入",ergebnis:"结果",bruttoR:"毛收益率",nettoR:"净收益率",rate:"月供",cashflow:"月现金流",laufzeit:"贷款期限",nbk:"购买附加费",darlehen:"贷款额",steuerErs:"节税额",risk:"风险等级",niedrig:"低",mittel:"中",hoch:"高",check:"快速检查",jPl:"年后",pJ:"年均",iwert:"房产价值",gut:"良好",ok:"一般",krit:"需关注",nK:"扣除费用后",pos:"正现金流",zus:"需补贴",oL:"房产与位置",fin:"融资",stNk:"附加费与税务",wZ:"增值与期限",vgl:"参考租金",lDat:"上次调整",lMiet:"当时租金",kapp:"租金上限",ang:"紧张市场",std:"标准市场",nE:"下次租金调整",mxE:"最大涨幅",nM:"最高新租金",jM:"现在可调",ab:"从",keE:"无调整",mPl:"租金调整计划",dat:"日期",akt:"当前",erh:"涨幅",sta:"状态",foe:"补贴",amo:"回收期",eKl:"能效等级",vor:"之前",nac:"之后",esp:"节能",co2:"碳减排",tPl:"还款计划",bel:"贷款价值比",rest:"剩余贷款",gZin:"总利息",gAuf:"总支出",gas:"天然气",oel:"燃油",wp:"热泵",pel:"颗粒",fw:"集中供暖",koh:"煤炭",str:"电力",alt:"超过20年",mitt:"10–20年",neu:"10年以下",mR:"租赁法",sBJ:"建筑年份",sHTyp:"供暖类型",sHAlt:"供暖年龄",sPers:"人数",sWfl:"居住面积",sFenStd:"标准窗户",sFenXL:"特大窗户 (>3m²)",sFenHST:"提升滑动门",sAnbau:"附属情况",sFasFl:"外墙面积",sDaFl:"屋顶面积",sDaForm:"屋顶形状",sLeist:"功率",sKap:"容量",sKeFl:"地下室面积",sOgFl:"楼层天花板",sStrPr:"电价",sHkos:"供暖成本",sFqAvg:"平均补贴率",sJEsp:"年节省",sCO2R:"CO₂ 减排",sEnerEsp:"节能",sGesK:"装修总成本",sNetK:"净额",sAmoR:"回本计算",sAmoSub:"净成本 ÷ 年节省",sMassDet:"详细措施",sGesamt:"总计",anbFrei:"独立式",anbDoppel:"双拼",anbMittel:"联排中间",dchSattel:"双坡顶",dchFlach:"平顶",dchWalm:"四坡顶",sGebData:"建筑数据",sEnergie:"能源价格",sStruktur:"建筑结构",sMassnahmen:"选择措施",kennzahlen:"📈 分析与关键指标",cfOhneSt:"月均现金流（不含税收优惠）",cfMitSt:"月均现金流（含税收优惠）",cfBasis:"租金 − 费用 − 还款",cfMitSub:"含折旧税收节省",brGreen:"稳健的毛收益率",brYellow:"可接受",brRed:"低于市场水平",brGreenTip:"市场标准 ≥ 5%。净收益率的良好起点。",brYellowTip:"足够，但运营成本会明显压缩净利润率。",brRedTip:"检查购买价格、租金或附加费用。",nrGreen:"扣除费用后具有吸引力",nrYellow:"运营成本已覆盖",nrRed:"成本风险",nrGreenTip:"包含所有运营成本。稳健回报。",nrYellowTip:"覆盖成本，但空置或维修缓冲不足。",nrRedTip:"房产几乎无法覆盖运营成本。",cfOGreen:"房产自给自足",cfOYellow:"勉强平衡",cfORed:"需要月度补贴",cfOGreenTip:"无任何税收优惠仍为正值。最佳起点。",cfOYellowTip:"几乎平衡。1-2个月空置即可能成为问题。",cfORedTip:"需要个人月度补贴。计划至少6个月的流动储备。",cfMGreen:"含税收优惠后为正",cfMYellow:"勉强为正",cfMRed:"含税也为负",cfMGreenTip:"好——但前提是缴纳足够的所得税。",cfMYellowTip:"仅在全额税收优惠下勉强为正。",cfMRedTip:"即使AfA和利息扣除后仍为负。",belGreen:"保守融资",belYellow:"市场标准",belRed:"高杠杆",belGreenTip:"最佳利率。高股权比例提供价值下跌缓冲。",belYellowTip:"投资者典型水平。可能有利率加成。",belRedTip:"信用评级和收入尤为重要。",lzGreen:"短期",lzYellow:"中期",lzRed:"超长期",lzInf:"永不还清",lzGreenTip:"快速还清债务。有利于资本积累。",lzYellowTip:"可管理。关注再融资条件。",lzRedTip:"长期承诺显著增加利率变动风险。",lzInfTip:"增加还款额——按当前利率贷款永远无法还清。",vermietQ:"出租房产？",vermietJa:"是，已出租",vermietNein:"否 / 自用",immLeerQ:"目前出租中？",immLeerJa:"是，目前出租",immLeerNein:"否，目前空置",chartTitle1:"剩余债务、现金流与年租金",chartRestschuld:"剩余债务",chartKumCF:"累计现金流",chartJahresmiete:"年租金",chartZinsbind:"固定利率结束",chartTitle2:"月度现金流走势",chartCFOhne:"不含税收优惠",chartCFMit:"含税收优惠",chartDiff:"差额 = 税收优惠",chartHoverKumCF:"累计现金流",chartHoverJahresmiete:"年租金",chartHoverCFOhne:"不含税现金流",chartHoverCFMit:"含税现金流",chartHoverSteuervorteil:"税收优惠",chartDisclamer:"⚠️ 税收优惠需缴纳足够所得税。请咨询税务顾问。",tblTitle:"年度发展",tblJahresmiete:"年租金",tblCFOhne:"不含税CF",tblCFMit:"含税CF",tblSumme:"合计",detTitle:"出售方案（",detJahren:"年后）",detSub:"如果在分析期结束后出售房产，会剩余多少？",detErtraege:"收入",detErloes:"出售收益",detCumCFOhne:"累计现金流（不含税）",detCumSteuer:"累计税收节省",detSteuerHinweis:"需缴纳足够所得税",detAufwand:"支出",detSumme:"合计",detSaldoOhne:"总余额（不含税）",detSaldoMit:"总余额（含税）",detEKR:"权益回报",detSteuerVoraus:"需缴纳足够所得税",detInfo:"税收优惠 = 利息扣除、折旧和不可转嫁费用 × 税率。",saldoOhne:"不含税余额",saldoMit:"含税余额",sanTip1:"顺序：先围护结构（窗、屋顶、外墙），再供暖。",sanTip2:"聘请能源顾问：iSFP奖励+5%补贴，咨询本身补贴50%。",sanTip3:"BAFA/KfW申请必须在签合同前提交！",sanTip4:"GEG § 72：>30年供暖必须更换。§ 71：65%可再生能源。",sanTip5:"§ 35c EStG：3年内可抵扣20%费用（最多4万欧元）。",sanTip6:"水力平衡：KfW必需，降低供暖5–15%。",sanTip7:"PV+电池：自用率~70%，适合EV和热泵。",sBerat:"咨询",ertraege:"收入",aufwend:"支出",gSaldoOhne:"不含税收优惠的总余额",gSaldoMit:"含税收优惠的总余额",pdfExport:"导出为 PDF",rechtlGrundlagen:"法律依据",sondTilgLabel:"额外还款",vereinbSatz:"约定比率",entspricht:"相当于",stdSond:"标准：贷款额的5%（大多数银行可自由约定）",neueLaufzeit:"新期限",zinsenGespart:"节省利息",statt:"而非",effekt:"效果",steuerNeutral:"从第",steuerNeutralSub:"年起税收中性（税收节省覆盖附加费用）",positivSaldo:"正总余额",nachJahrenVerk:"{n}年后出售",zins:"利息",tilgK:"还款",belCond90:"⚠️ >90% - 利率附加",belCond80:"🟡 80-90% - 正常条件",belCondOk:"✅ <80% - 最佳条件",markt:"市场",riskShow:"▼ 显示风险因素",riskHide:"▲ 隐藏因素",rechtsHinweis:"此信息不构成法律建议。具体情况请咨询税务顾问或律师。",analyseZr:"分析期限",vercomp:"已达参考租金上限",sanMassN1:"换窗",sanMassN2:"外墙隔热",sanMassN3:"供暖更新",sanMassN4:"屋顶更新",sanMassN5:"入口门",sanMassN6:"光伏",sanMassN7:"地下室天花板隔热",sanMassN8:"顶层楼板",sanMassN9:"电池储能",sanMassN10:"通风",sHkJahr:"供暖费/年",sSkJahr:"电费/年",sPreisstieg:"能源价格涨幅",sAutoCalc:"自动",sPS0:"0%/年（固定）",sPS1:"+1%/年",sPS2:"+2%/年（预测）",sPS3:"+3%/年",sPS5:"+5%/年（保守）",sCapHin:"已应用BAFA/KfW上限",tierS:"标准",tierG:"高档",tierM:"高级",sTierFenS:"PVC框架",sTierFenG:"铝复合",sTierFenM:"木铝+APP",sTierFasS:"10cm保温",sTierFasG:"16cm高档",sTierFasM:"20cm生态麻",sTierHzS:"供暖+泵",sTierHzG:"+散热器+控制",sTierHzM:"+地暖+APP",sTierDaS:"重新铺瓦+保温",sTierDaG:"+防水层+钣金",sTierDaM:"新屋架",sTierTuS:"标准安全",sTierTuG:"高品质",sTierTuM:"高级+指纹",sTierPvS:"屋顶安装，并网",sTierPvG:"屋顶集成+能源管理",sTierPvM:"太阳能瓦",sTierLuS:"基础通风",sTierLuG:"更好过滤",sTierLuM:"高级+控制",sSrcBafa:"BAFA BEG EM (§ 89 GEG)",sSrcHz:"BAFA BEG EM + 供暖更换奖励",sSrcPv:"KfW 270 (低息, EEG 2023)",sSrcBat:"州级补贴（地区性）",sondTilgSub:"缩短贷款期限的年度额外还款 (§ 500 BGB)",adv1:"毛净差 > 2% - 审查成本结构：不可转嫁费用或空置率正显著压低净收益率。",adv2:"乘数 > 30 - 购买价格超过30年净租金。仅靠租金收入回本需要很长时间。",adv3:"净收益率低于融资利率 - 负杠杆效应：债务成本超过其带来的收益。",adv4:"最高税率 > 42% - 折旧和利息抵扣具有最大税务效应。建议与税务顾问优化税务结构。",adv5:"土地份额 > 40% - 高土地份额降低可折旧基数。需要进行购买价格分配。",adv6:"空置率 > 5% 且现金流为负 - 建议保留至少6个月租金的流动储备。",adv7:"再融资 > 贷款的60% - 固定期结束后利率风险高。考虑远期抵押贷款。",adv8:"固定期 < 10年且利率 > 3.5% - 再融资风险较高。建议至少10年固定期。",adv9:"还款率 < 2% - 还款率极低。建议提高至至少2%以缩短贷款期限。",adv10:"未使用额外还款 - 年度额外还款将大幅减少期限和总利息。",adv11:"贷款价值比80-90% - 增加更多自有资金可获得更优惠的利率条件。",adv12:"租金比参考租金低 > 15% - 可逐步调整。租金上限尚未用尽。",adv13:"上次调整 > 3年前 - 3年窗口期已完全重置。可获得最大调整空间。",adv14:"已达租金上限，参考租金远高于当前 - 需等待下一个3年窗口期结束后才能再次获得完整空间。",adv15:"紧张市场且租金接近参考租金 - 可考虑§ 559 BGB现代化租金上涨作为替代方案。",adv16:"回本期 > 20年 - KfW贷款的利率优势可显著缩短回本期。",adv17:"装修后能效等级仍低于C级 - 2033年起面临欧盟出租禁令风险。",adv18:"更换供暖但未保温 - 热泵需要隔热的建筑围护结构。没有外墙/屋顶保温，效率会大幅降低。",advTitle:"💡 分析",datastand:"数据截至",garageKauf:"车库/车位",sonderUml:"特别摊款",renovierung:"装修费用",renovSofort:"✅ 低于15%阈值 — 可立即作为费用扣除。",renovAktiv:"⚠️ 超过15%阈值 — 必须资本化，不可立即扣除。",renovEigennutz:"自用房产：不可税前扣除。",renovGrenzHinw:"建筑购价15%上限",stCheck:"自持测试",stZielKP:"目标房价 (CF\u00a0=\u00a00)",stSelbstAb:"自持起始",stOhneStAkt:"无税收优惠\u00b7当前价格",stSofort:"立即",stAusserhalb:"超出范围",stCFPositiv:"第\u00a01天起CF为正",stMietSteig:"租金涨价",stVerhandlZiel:"谈判目标",stIstKPPuffer:"低于当前价格\u00a0—\u00a0缓冲",stMitStVor:"含税收优惠",stUnterZiel:"低于目标",stHero1:"该房产可自持\u00a0— 无需任何税收优惠即现金流为正。完美起点。",stHero2:"含税收优惠已可自持（{cf}/月）。不含税还差{diff}/月\u00a0— 小缓冲风险。",stHero3:"将房价砍价{diff}（{pct}）至{kp}\u00a0— 房产无需每月补贴即自持。",stHero4a:"当前价格下直到第{j}年才能自持（租金涨价）。立即自持的目标价：{kp}。",stHero4b:"当前价格无法自持。自持目标房价：{kp}（−{diff}）。"},
hi:{haupt:"रिटर्न",kredit:"ऋण",miete:"किराया",sanier:"नवीनीकरण",bundesland:"राज्य",kaufpreis:"खरीद मूल्य",flaeche:"रहने का क्षेत्र",preisQm:"मूल्य/वर्ग मी.",kaltmiete:"ठंडा किराया (मासिक)",nichtUml:"गैर-वसूली योग्य",leerstand:"रिक्ति",eigenkapital:"स्वपूंजी",zinssatz:"ब्याज दर",tilgung:"चुकौती",zinsbindung:"निश्चित दर अवधि",grEst:"हस्तांतरण कर",notar:"नोटरी",makler:"दलाली",steuersatz:"कर दर",afa:"मूल्यह्रास",grundAnteil:"भूमि हिस्सा",gebAnteil:"भवन हिस्सा",wertP:"मूल्य वृद्धि",jahre:"विश्लेषण अवधि",sonder:"गैराज/पार्किंग",plz:"पिन कोड",ort:"शहर",eingabe:"इनपुट",ergebnis:"परिणाम",bruttoR:"सकल प्रतिफल",nettoR:"शुद्ध प्रतिफल",rate:"किस्त/माह",cashflow:"नकदी प्रवाह/माह",laufzeit:"ऋण अवधि",nbk:"खरीद लागत",darlehen:"ऋण",steuerErs:"कर बचत",risk:"जोखिम स्तर",niedrig:"कम",mittel:"मध्यम",hoch:"उच्च",check:"त्वरित जांच",jPl:"वर्ष बाद",pJ:"औसत/वर्ष",iwert:"संपत्ति मूल्य",gut:"अच्छा",ok:"ठीक",krit:"गंभीर",nK:"लागत के बाद",pos:"सकारात्मक",zus:"सब्सिडी आवश्यक",oL:"संपत्ति और स्थान",fin:"वित्तपोषण",stNk:"लागत और कर",wZ:"मूल्य वृद्धि और अवधि",vgl:"तुलनात्मक किराया",lDat:"अंतिम वृद्धि",lMiet:"पिछला किराया",kapp:"किराया सीमा",ang:"तनावपूर्ण बाज़ार",std:"सामान्य बाज़ार",nE:"अगली वृद्धि",mxE:"अधिकतम वृद्धि",nM:"अधिकतम नया किराया",jM:"अभी संभव",ab:"से",keE:"कोई वृद्धि नहीं",mPl:"किराया वृद्धि योजना",dat:"तिथि",akt:"वर्तमान",erh:"वृद्धि",sta:"स्थिति",foe:"सब्सिडी",amo:"वापसी अवधि",eKl:"ऊर्जा वर्ग",vor:"पहले",nac:"बाद",esp:"बचत",co2:"CO₂ कमी",tPl:"भुगतान योजना",bel:"ऋण-मूल्य अनुपात",rest:"शेष ऋण",gZin:"कुल ब्याज",gAuf:"कुल व्यय",gas:"प्राकृतिक गैस",oel:"हीटिंग तेल",wp:"ताप पंप",pel:"पेलेट",fw:"दूरस्थ ताप",koh:"कोयला",str:"बिजली",alt:"20 वर्ष से अधिक",mitt:"10–20 वर्ष",neu:"10 वर्ष से कम",mR:"किराया कानून",sBJ:"निर्माण वर्ष",sHTyp:"हीटिंग प्रकार",sHAlt:"हीटिंग आयु",sPers:"व्यक्ति",sWfl:"रहने का क्षेत्र",sFenStd:"मानक खिड़कियां",sFenXL:"अतिरिक्त बड़ी (>3m²)",sFenHST:"लिफ्ट-स्लाइड दरवाजे",sAnbau:"संलग्न स्थिति",sFasFl:"मुखौटा क्षेत्र",sDaFl:"छत क्षेत्र",sDaForm:"छत आकार",sLeist:"शक्ति",sKap:"क्षमता",sKeFl:"तहखाना क्षेत्र",sOgFl:"मंजिल की छत",sStrPr:"बिजली मूल्य",sHkos:"हीटिंग लागत",sFqAvg:"औसत सब्सिडी कोटा",sJEsp:"वार्षिक बचत",sCO2R:"CO₂ कमी",sEnerEsp:"ऊर्जा बचत",sGesK:"कुल नवीनीकरण लागत",sNetK:"शुद्ध",sAmoR:"वापसी गणना",sAmoSub:"शुद्ध लागत ÷ वार्षिक बचत",sMassDet:"विस्तृत उपाय",sGesamt:"कुल",anbFrei:"स्वतंत्र",anbDoppel:"दोहरा घर",anbMittel:"मध्य-पंक्ति",dchSattel:"ढलान छत",dchFlach:"समतल छत",dchWalm:"कूल्हे की छत",sGebData:"भवन डेटा",sEnergie:"ऊर्जा मूल्य",sStruktur:"भवन संरचना",sMassnahmen:"उपाय चुनें",kennzahlen:"📈 विश्लेषण और प्रमुख संकेतक",cfOhneSt:"CF/माह कर लाभ के बिना",cfMitSt:"CF/माह कर लाभ सहित",cfBasis:"किराया − लागत − किस्त",cfMitSub:"AfA कर बचत सहित",brGreen:"ठोस सकल प्रतिफल",brYellow:"स्वीकार्य",brRed:"बाजार से कम",brGreenTip:"बाजार मानक ≥ 5%। सकारात्मक शुद्ध प्रतिफल के लिए अच्छा बिंदु।",brYellowTip:"पर्याप्त, लेकिन परिचालन लागत शुद्ध मार्जिन कम करती है।",brRedTip:"खरीद मूल्य, किराया या लागत जांचें।",nrGreen:"लागत के बाद आकर्षक",nrYellow:"परिचालन लागत कवर",nrRed:"लागत जोखिम",nrGreenTip:"सभी परिचालन लागत शामिल। ठोस प्रतिफल।",nrYellowTip:"लागत कवर करती है, लेकिन रिक्ति के लिए कम बफर।",nrRedTip:"संपत्ति परिचालन लागत मुश्किल से कवर करती है।",cfOGreen:"संपत्ति स्वावलंबी",cfOYellow:"बमुश्किल संतुलित",cfORed:"मासिक अतिरिक्त आवश्यक",cfOGreenTip:"किसी कर लाभ के बिना सकारात्मक। सर्वोत्तम स्थिति।",cfOYellowTip:"लगभग संतुलित। 1-2 महीने की रिक्ति समस्या बन सकती है।",cfORedTip:"मासिक कर्तव्य आवश्यक। कम से कम 6 महीने का भंडार योजना बनाएं।",cfMGreen:"कर लाभ के साथ सकारात्मक",cfMYellow:"बमुश्किल सकारात्मक",cfMRed:"कर के साथ भी नकारात्मक",cfMGreenTip:"अच्छा — लेकिन पर्याप्त आयकर भुगतान आवश्यक।",cfMYellowTip:"केवल पूर्ण कर लाभ के साथ बमुश्किल सकारात्मक।",cfMRedTip:"AfA और ब्याज कटौती के बाद भी नकारात्मक।",belGreen:"रूढ़िवादी वित्तपोषण",belYellow:"बाजार मानक",belRed:"उच्च बाहरी वित्तपोषण",belGreenTip:"सर्वोत्तम ब्याज दरें। मूल्य गिरावट के खिलाफ बफर।",belYellowTip:"निवेशकों के लिए विशिष्ट। ब्याज अधिभार संभव।",belRedTip:"क्रेडिट रेटिंग और आय विशेष रूप से महत्वपूर्ण।",lzGreen:"कम अवधि",lzYellow:"मध्यम अवधि",lzRed:"बहुत लंबी अवधि",lzInf:"कभी नहीं चुकाया",lzGreenTip:"जल्दी कर्जमुक्त। पूंजी निर्माण के लिए अनुकूल।",lzYellowTip:"प्रबंधनीय। निश्चित दर के बाद शर्तों पर ध्यान दें।",lzRedTip:"लंबी प्रतिबद्धता ब्याज दर जोखिम बढ़ाती है।",lzInfTip:"पुनर्भुगतान बढ़ाएं — वर्तमान दर पर ऋण कभी नहीं चुकाया जाएगा।",vermietQ:"किराए पर दें?",vermietJa:"हां, किराए पर",vermietNein:"नहीं / स्वयं उपयोग",immLeerQ:"वर्तमान में किराए पर?",immLeerJa:"हां, वर्तमान में किराए पर",immLeerNein:"नहीं, खाली है",chartTitle1:"शेष ऋण, नकदी प्रवाह और वार्षिक किराया",chartRestschuld:"शेष ऋण",chartKumCF:"संचयी नकदी प्रवाह",chartJahresmiete:"वार्षिक किराया",chartZinsbind:"निश्चित दर समाप्त",chartTitle2:"मासिक नकदी प्रवाह समय के साथ",chartCFOhne:"कर लाभ के बिना",chartCFMit:"कर लाभ सहित",chartDiff:"अंतर = कर लाभ",chartHoverKumCF:"संचयी CF",chartHoverJahresmiete:"वार्षिक किराया",chartHoverCFOhne:"कर बिना CF",chartHoverCFMit:"कर सहित CF",chartHoverSteuervorteil:"कर लाभ",chartDisclamer:"⚠️ कर लाभ के लिए पर्याप्त आयकर आवश्यक। कर सलाहकार से परामर्श करें।",tblTitle:"वार्षिक विकास",tblJahresmiete:"वार्षिक किराया",tblCFOhne:"कर बिना CF",tblCFMit:"कर सहित CF",tblSumme:"कुल",detTitle:"विक्रय परिदृश्य:",detJahren:"वर्ष बाद",detSub:"यदि विश्लेषण अवधि के बाद संपत्ति बेची जाए तो क्या बचेगा?",detErtraege:"आय",detErloes:"बिक्री आय",detCumCFOhne:"संचयी CF (कर बिना)",detCumSteuer:"संचयी कर बचत",detSteuerHinweis:"पर्याप्त आयकर आवश्यक",detAufwand:"व्यय",detSumme:"कुल",detSaldoOhne:"कुल शेष (कर बिना)",detSaldoMit:"कुल शेष (कर सहित)",detEKR:"इक्विटी रिटर्न",detSteuerVoraus:"पर्याप्त आयकर आवश्यक",detInfo:"कर लाभ = ब्याज कटौती, मूल्यह्रास और गैर-वसूली योग्य लागत × कर दर।",saldoOhne:"कर बिना शेष",saldoMit:"कर सहित शेष",sanTip1:"क्रम: पहले भवन आवरण (खिड़की, छत, अग्रभाग), फिर हीटिंग।",sanTip2:"ऊर्जा सलाहकार: iSFP बोनस +5%। सलाह स्वयं 50% सब्सिडाइज्ड।",sanTip3:"BAFA/KfW आवेदन अनुबंध से पहले करें!",sanTip4:"GEG § 72: >30 साल पुरानी हीटिंग बदलें। § 71: 65% नवीकरणीय।",sanTip5:"§ 35c EStG: 3 वर्षों में 20% लागत कटौती (अधिकतम 40,000€)।",sanTip6:"हाइड्रोलिक बैलेंसिंग: KfW अनिवार्य, हीटिंग 5–15% कम।",sanTip7:"PV + बैटरी: स्व-उपभोग ~70%। EV और ताप पंप के लिए आदर्श।",sBerat:"सलाह",ertraege:"आय",aufwend:"व्यय",gSaldoOhne:"कर लाभ के बिना कुल शेष",gSaldoMit:"कर लाभ सहित कुल शेष",pdfExport:"PDF के रूप में निर्यात",rechtlGrundlagen:"कानूनी आधार",sondTilgLabel:"अतिरिक्त भुगतान",vereinbSatz:"सहमत दर",entspricht:"बराबर है",stdSond:"मानक: ऋण राशि का 5% (अधिकांश बैंकों में स्वतंत्र रूप से सहमत)",neueLaufzeit:"नई अवधि",zinsenGespart:"ब्याज बचत",statt:"की बजाय",effekt:"प्रभाव",steuerNeutral:"वर्ष से कर-तटस्थ",steuerNeutralSub:"(कर बचत सहायक लागत को कवर करती है)",positivSaldo:"सकारात्मक कुल शेष",nachJahrenVerk:"{n} वर्ष बाद बिक्री पर",zins:"ब्याज",tilgK:"चुकौती",belCond90:"⚠️ >90% - ब्याज अधिभार",belCond80:"🟡 80-90% - सामान्य शर्तें",belCondOk:"✅ <80% - सर्वोत्तम शर्तें",markt:"बाज़ार",riskShow:"▼ जोखिम कारक दिखाएं",riskHide:"▲ कारक छुपाएं",rechtsHinweis:"यह जानकारी कानूनी सलाह नहीं है। विशिष्ट मामलों के लिए कर सलाहकार या वकील से परामर्श करें।",analyseZr:"विश्लेषण अवधि",vercomp:"संदर्भ किराया सीमा पहुँची",sanMassN1:"खिड़की बदलाव",sanMassN2:"अग्रभाग इन्सुलेशन",sanMassN3:"हीटिंग नवीनीकरण",sanMassN4:"छत नवीनीकरण",sanMassN5:"प्रवेश द्वार",sanMassN6:"फोटोवोल्टेइक",sanMassN7:"तहखाना छत इन्सुलेशन",sanMassN8:"शीर्ष मंजिल छत",sanMassN9:"बैटरी भंडारण",sanMassN10:"वेंटिलेशन",sHkJahr:"हीटिंग लागत/वर्ष",sSkJahr:"बिजली लागत/वर्ष",sPreisstieg:"ऊर्जा मूल्य वृद्धि",sAutoCalc:"स्वचालित",sPS0:"0%/वर्ष (स्थिर)",sPS1:"+1%/वर्ष",sPS2:"+2%/वर्ष (पूर्वानुमान)",sPS3:"+3%/वर्ष",sPS5:"+5%/वर्ष (रूढ़िवादी)",sCapHin:"BAFA/KfW सीमा लागू",tierS:"मानक",tierG:"उन्नत",tierM:"प्रीमियम",sTierFenS:"PVC फ्रेम",sTierFenG:"एल्यू-कम्पोजिट",sTierFenM:"लकड़ी-एल्यू+ऐप",sTierFasS:"10सेमी इन्सुलेशन",sTierFasG:"16सेमी प्रीमियम",sTierFasM:"20सेमी इको-हेम्प",sTierHzS:"हीटिंग+पंप",sTierHzG:"+रेडिएटर+नियंत्रण",sTierHzM:"+फर्श हीटिंग+ऐप",sTierDaS:"पुनः छत+इन्सुलेशन",sTierDaG:"+अंडरले+शीट",sTierDaM:"नई छत संरचना",sTierTuS:"मानक सुरक्षा",sTierTuG:"उच्च गुणवत्ता",sTierTuM:"प्रीमियम+फिंगरप्रिंट",sTierPvS:"छत पर, फीड-इन",sTierPvG:"छत में+ऊर्जा प्रबंधन",sTierPvM:"सौर छत टाइल",sTierLuS:"बुनियादी वेंटिलेशन",sTierLuG:"बेहतर फिल्टर",sTierLuM:"प्रीमियम+नियंत्रण",sSrcBafa:"BAFA BEG EM (§ 89 GEG)",sSrcHz:"BAFA BEG EM + हीटिंग बोनस",sSrcPv:"KfW 270 (कम ब्याज, EEG 2023)",sSrcBat:"राज्य सब्सिडी (क्षेत्रीय)",sondTilgSub:"ऋण अवधि कम करने के लिए वार्षिक अतिरिक्त भुगतान (§ 500 BGB)",adv1:"सकल-शुद्ध अंतर > 2% - लागत संरचना की जांच करें।",adv2:"गुणक > 30 - खरीद मूल्य 30 वार्षिक किराए से अधिक है।",adv3:"शुद्ध प्रतिफल वित्तपोषण दर से कम - नकारात्मक लीवरेज प्रभाव।",adv4:"शीर्ष कर दर > 42% - AfA और ब्याज कटौती का अधिकतम कर प्रभाव।",adv5:"भूमि हिस्सा > 40% - उच्च भूमि हिस्सा मूल्यह्रास आधार कम करता है।",adv6:"रिक्ति > 5% और नकारात्मक नकदी प्रवाह - कम से कम 6 मासिक किराए की तरल आरक्षित अनुशंसित।",adv7:"पुनर्वित्त > ऋण का 60% - निश्चित अवधि के बाद उच्च ब्याज दर जोखिम।",adv8:"निश्चित अवधि < 10 वर्ष और ब्याज > 3.5% - पुनर्वित्त जोखिम बढ़ा हुआ।",adv9:"चुकौती < 2% - बहुत कम चुकौती। कम से कम 2% तक बढ़ाएं।",adv10:"अतिरिक्त भुगतान उपयोग नहीं - वार्षिक अतिरिक्त भुगतान अवधि और कुल ब्याज काफी कम करेगा।",adv11:"LTV 80-90% - अधिक इक्विटी के साथ बेहतर ब्याज शर्तें संभव।",adv12:"किराया संदर्भ किराए से > 15% कम - क्रमिक वृद्धि संभव।",adv13:"अंतिम वृद्धि > 3 वर्ष पहले - 3-वर्षीय खिड़की पूरी तरह रीसेट।",adv14:"किराया सीमा पहुंची, संदर्भ किराया काफी अधिक - अगली 3-वर्षीय खिड़की तक पूर्ण स्थान नहीं।",adv15:"तनावपूर्ण बाजार और किराया संदर्भ के पास - § 559 BGB आधुनिकीकरण किराया वृद्धि विकल्प।",adv16:"वापसी > 20 वर्ष - KfW ऋण की ब्याज सुविधा वापसी अवधि काफी कम कर सकती है।",adv17:"नवीनीकरण के बाद ऊर्जा वर्ग अभी C से नीचे - 2033 से EU किराए पर प्रतिबंध जोखिम।",adv18:"बिना इन्सुलेशन के हीटिंग बदला - ताप पंप को इन्सुलेटेड भवन आवरण की आवश्यकता है।",advTitle:"💡 विश्लेषण",datastand:"डेटा स्थिति",garageKauf:"गैराज/पार्किंग",sonderUml:"विशेष अंशदान",renovierung:"नवीनीकरण लागत",renovSofort:"✅ 15% सीमा के नीचे — तत्काल व्यय के रूप में कटौती योग्य।",renovAktiv:"⚠️ 15% सीमा से ऊपर — पूंजीकरण आवश्यक।",renovEigennutz:"स्व-उपयोग: कर कटौती योग्य नहीं।",renovGrenzHinw:"भवन क्रय मूल्य की 15% सीमा",stCheck:"स्व-वित्तपोषण जांच",stZielKP:"लक्ष्य मूल्य (CF\u00a0=\u00a00)",stSelbstAb:"स्व-वित्तपोषण से",stOhneStAkt:"कर लाभ के बिना\u00b7वर्तमान मूल्य पर",stSofort:"तुरंत",stAusserhalb:"सीमा से बाहर",stCFPositiv:"पहले\u00a0दिन से CF सकारात्मक",stMietSteig:"किराया वृद्धि",stVerhandlZiel:"बातचीत का लक्ष्य",stIstKPPuffer:"वास्तविक मूल्य से कम\u00a0—\u00a0बफर",stMitStVor:"कर लाभ के साथ",stUnterZiel:"लक्ष्य से कम",stHero1:"यह संपत्ति स्व-वित्तपोषित है\u00a0— बिना किसी कर लाभ के नकदी प्रवाह सकारात्मक। सही शुरुआत।",stHero2:"कर लाभ के साथ स्व-वित्तपोषित ({cf}/माह)। कर के बिना {diff}/माह का अंतर\u00a0— छोटा जोखिम।",stHero3:"कीमत {diff} ({pct}) कम करके {kp} पर लाएं\u00a0— संपत्ति बिना मासिक भुगतान के स्व-वित्तपोषित।",stHero4a:"वर्तमान मूल्य पर वर्ष {j} से स्व-वित्तपोषित (किराया वृद्धि)। तुरंत स्व-वित्तपोषित के लिए: {kp}।",stHero4b:"वर्तमान मूल्य पर स्व-वित्तपोषित नहीं। लक्ष्य मूल्य: {kp} (−{diff})।"}};

// ═══ Landing Page Translations ═══
const TL={
  de:{h1a:"Immobilien ",h1b:"clever analysieren.",h1c:" Rendite kennen. Richtig entscheiden.",sub:"Vier professionelle Rechner für Kapitalanleger und Vermieter in Deutschland. Rendite, Finanzierung, Mietrecht und Sanierung – sofort, in Echtzeit, gratis.",mockKauf:"KAUFPREIS",mockMiete:"MONATLICHE MIETE",mockZins:"ZINSSATZ",mockEK:"EIGENKAPITAL",mockBrutto:"BRUTTORENDITE",mockNetto:"NETTORENDITE",mockRate:"Monatliche Rate",mockRateSub:"inkl. 2 % Tilgung",mockCF:"Monatlicher Cashflow",mockCFSub:"nach Kosten & Rate",mockChart:"CASHFLOW-VERLAUF",ratesTitle:"Tagesaktuelle Bauzinsen",ratesDisclaim:"Alle Angaben ohne Gewähr. Individuelle Konditionen können abweichen.",ratesStand:"Stand",ratesIntro1:"Die 10-jährige Bundesanleihe (BBK01.WT1010) liegt aktuell bei",ratesIntro2:"Bauzinsen für 10 Jahre Zinsbindung im Marktüberblick:",ratesSoll:"Sollzins",ratesAb:"ab ca.",ratesSources:"Quellen",cardsTitle:"Wählen Sie Ihren Rechner",uspTitle:"Was macht Immofuchs besonders",uspSub:"Mehr als nur ein Rechner",usp1H:"Tagesaktuelle Marktdaten",usp1P:"Bundesbank-Renditen, Bauzinsen und BEG-Förderquoten automatisch eingebunden — kein manuelles Nachschauen nötig.",usp3H:"Bundesland-spezifisch",usp3P:"Grunderwerbsteuer, Kappungsgrenzen (15 %/20 %) und Landesförderbanken werden je nach Ort automatisch angewendet.",howTitle:"So funktioniert's",step1H:"Rechner wählen",step1P:"Wählen Sie den passenden Rechner — Rendite, Kredit, Mieterhöhung oder Sanierung.",step2H:"Daten eingeben",step2P:"Kaufpreis, Miete, Zinsatz — alle Felder sind mit realistischen Werten vorbelegt.",step3H:"Sofort Ergebnisse",step3P:"Alle Ergebnisse updaten in Echtzeit. Keine Anmeldung, kein Warten, keine Kosten.",fullTitle:"Renditerechner",fullBadge:"Rendite",fullDesc:"Der umfassendste Rechner: Rendite, Cashflow, Steuervorteile, Mietrecht und Risikoanalyse in einem.",fullF1:"Brutto- & Netto-Mietrendite",fullF2:"Verkaufsszenario nach X Jahren",fullF3:"AfA & Steuervorteile (§ 7 EStG)",fullF4:"Mieterhöhungsplan (§ 558 BGB)",fullF5:"Risikoanalyse & Schnellcheck",fullF6:"PLZ-Autovervollständigung",fullCta:"Renditerechner öffnen",finTitle:"Kreditrechner",finBadge:"Finanzierung",finDesc:"Monatliche Rate, vollständiger Tilgungsplan und Restschuld nach Zinsbindung – schnell und präzise.",finF1:"Monatliche Annuität",finF2:"Sondertilgung & Laufzeit",finF3:"Beleihungsauslauf (LTV)",finF4:"Restschuld nach Zinsbindung",finF5:"Tilgungsvergleich",finF6:"Kaufnebenkosten",finCta:"Kreditrechner öffnen",rentTitle:"Mieterhöhung",rentBadge:"Mietrecht",rentDesc:"Wann ist die nächste Mieterhöhung möglich, wie viel darf erhöht werden und wie entwickelt sich die Miete?",rentF1:"Nächster Termin (§ 558 BGB)",rentF2:"Kappungsgrenze 15/20 % auto",rentF3:"Vergleichsmiete als Obergrenze",rentF4:"Prognose bis 20 Jahre",rentF5:"Über 200 Städte erkannt",rentF6:"Rechtliche Grundlagen",rentCta:"Mieterhöhung öffnen",sanTitle:"Sanierungsrechner",sanBadge:"Sanierung",sanDesc:"Kosten, BEG-Förderung, CO₂-Einsparung und Amortisationsdauer für energetische Sanierung berechnen.",sanF1:"Fenster, Hülle, Dach, Heizung",sanF2:"Bis zu 70 % BEG-Förderung",sanF3:"Energieklasse vorher/nachher",sanF4:"CO₂-Reduktion",sanF5:"Amortisationsberechnung",sanF6:"PV, Speicher & Wallbox",sanCta:"Sanierungsrechner öffnen",footerNote:"Immofuchs ist ein unabhängiges, kostenloses Tool für private Immobilieninvestoren in Deutschland. Alle Berechnungen basieren auf aktuellen Gesetzen und Marktdaten. Keine Rechts- oder Steuerberatung.",footerCr:"© 2026 immofuchs.info · Privatperson, kein Unternehmen",imp:"Impressum",dse:"Datenschutz",ratesCompact:"Bauzinsen Ø",ratesTip:"Marktindikation für 10 Jahre Zinsbindung. Quellen: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank. Stand Mai 2026.",ratesShort:"Topzins",ratesShort3:"BBank 10J",tagFull:"Kostenlos · Ohne Anmeldung · Aktuell",ctaPrimary:"Rechner öffnen",ctaSecondary:"Wie es funktioniert",heroEyebrow:"KOSTENLOS · LIVE-BAUZINSEN · KEINE ANMELDUNG",heroSubShort:"Vier professionelle Rechner. Sofort. Ohne Anmeldung.",navRechner:"Rechner",navBauzinsen:"Bauzinsen",navFaq:"So funktioniert's",trustHead:"Warum Immofuchs?",trust1H:"Rechtskonform",trust1P:"§ 558 BGB, GEG, GrEStG — alle Berechnungen nach geltendem deutschem Recht.",trust2H:"Datenschutz DE",trust2P:"Hosting in Deutschland. Keine Tracker, keine Cookies, kein Login.",trust3H:"Keine Anmeldung",trust3P:"Sofort starten. Daten bleiben im Browser, nichts wird gespeichert.",trust4H:"Aktuelle Daten",trust4P:"Bauzinsen monatlich aktualisiert, alle Werte aus offiziellen Quellen.",howShort:"In 3 Schritten zum Ergebnis",navHow:"So funktioniert's",navZinsen:"Bauzinsen",subShort:"Vier kostenlose Rechner für Kapitalanleger und Vermieter in Deutschland — Rendite, Finanzierung, Mietrecht, Sanierung. Sofort, in Echtzeit, ohne Anmeldung.",heroCtaPrimary:"Jetzt rechnen",heroCtaSecondary:"Wie funktioniert's?",heroBadgeLive:"Live-Daten",trust1:"100% kostenlos",trust2:"Keine Anmeldung",trust3:"DSGVO-konform",trust4:"Aktuelle Marktdaten",cardsSub:"Vier spezialisierte Rechner für jede Situation",dataEyebrow:"Keine Schätzungen",dataTitle:"Echte Marktdaten. Durchdachte Rechner.",dataSub:"Während andere Rechner mit fixen Beispielwerten arbeiten, zieht Immofuchs aktuelle Marktdaten automatisch ein — ohne dass du etwas eingeben musst.",dataStand:"Alle Werte monatlich geprüft — Datenstand:",usp2H:"Rechtsbezug eingebaut",usp2P:"§ 558 BGB, § 7 EStG, GEG 2024 — alle relevanten Gesetze direkt in jeder Berechnung.",usp4H:"Sofort starten",usp4P:"Kein Download, kein Login. Einfach öffnen und rechnen — alle Felder sind mit realistischen Werten vorbelegt.",usp5H:"100 % privat",usp5P:"Alle Berechnungen laufen im Browser. Keine Server, kein Tracking, keine Werbung, keine Anmeldung.",usp6H:"5 Sprachen · PDF-Export",usp6P:"DE, EN, TR, ZH, HI verfügbar. Alle Ergebnisse als PDF speicherbar.",dc1L:"Bauzinsen Ø",dc1S:"10 Jahre Zinsbindung",dc2L:"Mietpreisprognose",dc2S:"Stat. Bundesamt",dc3L:"Wertsteigerung",dc3S:"Marktprognose",dc4L:"Grunderwerbsteuer",dc4S:"3,5 % – 6,5 %",dc4V:"je Bundesland",dc5L:"Kappungsgrenzen",dc5S:"15 % / 20 % auto",dc5V:"200+ Städte",dc6L:"KfW BEG Förderung",dc6S:"der Investitionskosten",dc6V:"bis 70 %",dc7L:"CO₂-Preis",dc7S:"Umweltbundesamt",dc7V:"55 €/Tonne",dc8L:"AfA-Satz",dc8S:"§ 7 EStG",dc8V:"2 %",dc9L:"BAFA Förderung",dc9S:"BEG Einzelmaßnahmen",dc9V:"aktiv"},
  en:{h1a:"Analyze real estate ",h1b:"smartly.",h1c:" Know the yield. Decide right.",sub:"Four professional calculators for investors and landlords in Germany. Yield, financing, rent law and renovation – instant, real-time, free.",mockKauf:"PURCHASE PRICE",mockMiete:"MONTHLY RENT",mockZins:"INTEREST RATE",mockEK:"OWN CAPITAL",mockBrutto:"GROSS YIELD",mockNetto:"NET YIELD",mockRate:"Monthly Payment",mockRateSub:"incl. 2 % repayment",mockCF:"Monthly Cashflow",mockCFSub:"after costs & rate",mockChart:"CASHFLOW CHART",ratesTitle:"Current Mortgage Rates",ratesDisclaim:"All data without warranty. Individual terms may vary.",ratesStand:"As of",ratesIntro1:"The 10-year German government bond (BBK01.WT1010) currently stands at",ratesIntro2:"Mortgage rates for 10-year fixed periods, market overview:",ratesSoll:"nominal",ratesAb:"from approx.",ratesSources:"Sources",cardsTitle:"Choose your calculator",uspTitle:"What makes Immofuchs special",uspSub:"More than just a calculator",usp1H:"Daily market data",usp1P:"Bundesbank yields, mortgage rates and BEG subsidy quotas integrated automatically — no manual lookup needed.",usp3H:"State-specific",usp3P:"Real estate transfer tax, rent caps (15 %/20 %) and state development banks applied automatically by location.",howTitle:"How it works",step1H:"Choose calculator",step1P:"Choose the right calculator — yield, loan, rent or renovation.",step2H:"Enter data",step2P:"Purchase price, rent, interest rate — all fields are pre-filled with realistic values.",step3H:"Instant results",step3P:"All results update in real time. No signup, no waiting, no cost.",fullTitle:"Yield Calculator",fullBadge:"Yield",fullDesc:"The most comprehensive calculator: yield, cashflow, tax benefits, rent law and risk analysis in one.",fullF1:"Gross & net rental yield",fullF2:"Sale scenario after X years",fullF3:"AfA & tax benefits (§ 7 EStG)",fullF4:"Rent increase plan (§ 558 BGB)",fullF5:"Risk analysis & quick check",fullF6:"ZIP code autocomplete",fullCta:"Open yield calculator",finTitle:"Loan Calculator",finBadge:"Financing",finDesc:"Monthly payment, full amortization schedule and remaining debt after fixed rate period – fast and precise.",finF1:"Monthly annuity",finF2:"Extra payments & duration",finF3:"Loan-to-value ratio (LTV)",finF4:"Remaining debt after fixed period",finF5:"Repayment comparison",finF6:"Purchase side costs",finCta:"Open loan calculator",rentTitle:"Rent Increase",rentBadge:"Rent law",rentDesc:"When is the next rent increase possible, how much may it be and how does the rent develop?",rentF1:"Next date (§ 558 BGB)",rentF2:"Rent cap 15/20 % auto",rentF3:"Reference rent as ceiling",rentF4:"Forecast up to 20 years",rentF5:"Over 200 cities recognized",rentF6:"Legal foundations",rentCta:"Open rent increase",sanTitle:"Renovation Calculator",sanBadge:"Renovation",sanDesc:"Calculate costs, BEG subsidies, CO₂ savings and payback period for energy-efficient renovation.",sanF1:"Windows, facade, roof, heating",sanF2:"Up to 70 % BEG subsidy",sanF3:"Energy class before/after",sanF4:"CO₂ reduction",sanF5:"Payback calculation",sanF6:"PV, battery & wallbox",sanCta:"Open renovation calculator",footerNote:"Immofuchs is an independent, free tool for private real estate investors in Germany. All calculations are based on current laws and market data. No legal or tax advice.",footerCr:"© 2026 immofuchs.info · Private individual, no business",imp:"Legal Notice",dse:"Privacy",ratesCompact:"Avg. mortgage rate",ratesTip:"Market indication for 10-year fixed periods. Sources: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank. As of May 2026.",ratesShort:"Top rate",ratesShort3:"BBank 10Y",tagFull:"Free · No Signup · Live data",ctaPrimary:"Open calculator",ctaSecondary:"How it works",heroEyebrow:"FREE · LIVE RATES · NO SIGNUP",heroSubShort:"Four professional calculators. Instant. No signup.",navRechner:"Calculators",navBauzinsen:"Mortgage rates",navFaq:"How it works",trustHead:"Why Immofuchs?",trust1H:"Legally compliant",trust1P:"§ 558 BGB, GEG, GrEStG — all calculations follow German law.",trust2H:"German data protection",trust2P:"German hosting. No trackers, no cookies, no login.",trust3H:"No signup",trust3P:"Start immediately. Data stays in your browser, nothing is stored.",trust4H:"Up-to-date data",trust4P:"Mortgage rates updated monthly, all values from official sources.",howShort:"3 steps to your result",navHow:"How it works",navZinsen:"Mortgage rates",subShort:"Four free calculators for investors and landlords in Germany — yield, financing, tenancy law, renovation. Instant, real-time, no signup.",heroCtaPrimary:"Start calculating",heroCtaSecondary:"How does it work?",heroBadgeLive:"Live data",trust1:"100% free",trust2:"No signup",trust3:"GDPR-compliant",trust4:"Live market data",cardsSub:"Four specialized calculators for every situation",dataEyebrow:"No estimates",dataTitle:"Real market data. Thoughtful calculators.",dataSub:"While other calculators use fixed example values, Immofuchs automatically pulls in current market data — without you having to enter anything.",dataStand:"All values checked monthly — data as of:",usp2H:"Legal reference built-in",usp2P:"§ 558 BGB, § 7 EStG, GEG 2024 — all relevant laws directly in every calculation.",usp4H:"Start instantly",usp4P:"No download, no login. Just open and calculate — all fields are pre-filled with realistic values.",usp5H:"100 % private",usp5P:"All calculations run in the browser. No server, no tracking, no ads, no signup.",usp6H:"5 languages · PDF export",usp6P:"DE, EN, TR, ZH, HI available. All results saveable as PDF.",dc1L:"Avg. mortgage rate",dc1S:"10-year fixed period",dc2L:"Rent price forecast",dc2S:"Federal Stat. Office",dc3L:"Appreciation",dc3S:"Market forecast",dc4L:"Transfer tax",dc4S:"3.5 % – 6.5 %",dc4V:"by federal state",dc5L:"Rent caps",dc5S:"15 % / 20 % auto",dc5V:"200+ cities",dc6L:"KfW BEG subsidy",dc6S:"of investment costs",dc6V:"up to 70 %",dc7L:"CO₂ price",dc7S:"Fed. Environment Agency",dc7V:"€55/tonne",dc8L:"Depreciation rate",dc8S:"§ 7 EStG",dc8V:"2 %",dc9L:"BAFA subsidy",dc9S:"BEG single measures",dc9V:"active"},
  tr:{h1a:"Gayrimenkulü ",h1b:"akıllıca analiz edin.",h1c:" Getiriyi bilin. Doğru karar verin.",sub:"Almanya'daki yatırımcılar ve ev sahipleri için dört profesyonel hesaplayıcı. Getiri, finansman, kira hukuku ve yenileme – anında, gerçek zamanlı, ücretsiz.",mockKauf:"ALIM FİYATI",mockMiete:"AYLIK KİRA",mockZins:"FAİZ ORANI",mockEK:"ÖZ SERMAYE",mockBrutto:"BRÜT GETİRİ",mockNetto:"NET GETİRİ",mockRate:"Aylık Ödeme",mockRateSub:"% 2 itfa dahil",mockCF:"Aylık Nakit Akışı",mockCFSub:"masraflar ve taksit sonrası",mockChart:"NAKİT AKIŞI GRAFİĞİ",ratesTitle:"Güncel İpotek Faizleri",ratesDisclaim:"Tüm bilgiler garantisizdir. Bireysel koşullar değişebilir.",ratesStand:"Tarih",ratesIntro1:"10 yıllık Alman tahvili (BBK01.WT1010) şu anda",ratesIntro2:"10 yıllık sabit faiz dönemi için ipotek faizleri pazar genel görünümü:",ratesSoll:"nominal",ratesAb:"yaklaşık",ratesSources:"Kaynaklar",cardsTitle:"Hesaplayıcınızı seçin",uspTitle:"Immofuchs'u özel kılan nedir",uspSub:"Sadece bir hesaplayıcıdan fazlası",usp1H:"Günlük piyasa verileri",usp1P:"Bundesbank getirileri, ipotek oranları ve BEG sübvansiyon kotaları otomatik entegre edilmiştir.",usp3H:"Eyalete özel",usp3P:"Emlak vergisi, kira sınırları (%15/%20) ve eyalet bankaları konuma göre otomatik uygulanır.",howTitle:"Nasıl çalışır",step1H:"Hesaplayıcı seçin",step1P:"Uygun hesaplayıcıyı seçin — getiri, kredi, kira veya yenileme.",step2H:"Veri girin",step2P:"Alım fiyatı, kira, faiz — tüm alanlar gerçekçi değerlerle önceden doldurulmuştur.",step3H:"Anında sonuçlar",step3P:"Tüm sonuçlar gerçek zamanlı güncellenir. Kayıt, bekleme veya maliyet yoktur.",fullTitle:"Getiri Hesaplayıcı",fullBadge:"Getiri",fullDesc:"En kapsamlı hesaplayıcı: getiri, nakit akışı, vergi avantajları, kira hukuku ve risk analizi.",fullF1:"Brüt ve net kira getirisi",fullF2:"X yıl sonra satış senaryosu",fullF3:"AfA ve vergi avantajları",fullF4:"Kira artış planı",fullF5:"Risk analizi ve hızlı kontrol",fullF6:"PLZ otomatik tamamlama",fullCta:"Getiri hesaplayıcıyı aç",finTitle:"Kredi Hesaplayıcı",finBadge:"Finansman",finDesc:"Aylık ödeme, tam itfa planı ve sabit faiz dönemi sonrası kalan borç.",finF1:"Aylık yıllık gelir",finF2:"Ek ödemeler ve süre",finF3:"Kredi-değer oranı (LTV)",finF4:"Sabit dönem sonrası kalan borç",finF5:"Geri ödeme karşılaştırması",finF6:"Alım yan maliyetleri",finCta:"Kredi hesaplayıcıyı aç",rentTitle:"Kira Artışı",rentBadge:"Kira hukuku",rentDesc:"Bir sonraki kira artışı ne zaman mümkün, ne kadar yapılabilir ve kira nasıl gelişir?",rentF1:"Sonraki tarih (§ 558 BGB)",rentF2:"Kira sınırı %15/%20 otomatik",rentF3:"Referans kira tavan olarak",rentF4:"20 yıla kadar tahmin",rentF5:"200'den fazla şehir",rentF6:"Yasal temeller",rentCta:"Kira artışını aç",sanTitle:"Yenileme Hesaplayıcı",sanBadge:"Yenileme",sanDesc:"Enerji verimli yenileme için maliyetler, BEG sübvansiyonu, CO₂ tasarrufu ve geri ödeme süresi hesaplayın.",sanF1:"Pencere, cephe, çatı, ısıtma",sanF2:"% 70'e kadar BEG sübvansiyonu",sanF3:"Önce/sonra enerji sınıfı",sanF4:"CO₂ azaltımı",sanF5:"Geri ödeme hesaplaması",sanF6:"PV, batarya ve wallbox",sanCta:"Yenileme hesaplayıcıyı aç",footerNote:"Immofuchs Almanya'daki özel gayrimenkul yatırımcıları için bağımsız, ücretsiz bir araçtır. Hukuki veya vergi danışmanlığı değildir.",footerCr:"© 2026 immofuchs.info · Özel kişi, şirket değil",imp:"Künye",dse:"Gizlilik",ratesCompact:"Ort. ipotek faizi",ratesTip:"10 yıllık sabit faiz dönemi piyasa göstergesi. Kaynaklar: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank. Mayıs 2026.",ratesShort:"En iyi",ratesShort3:"BBank 10Y",tagFull:"Ücretsiz · Kayıtsız · Güncel",ctaPrimary:"Hesaplayıcıyı aç",ctaSecondary:"Nasıl çalışır",heroEyebrow:"ÜCRETSİZ · CANLI FAİZLER · KAYIT YOK",heroSubShort:"Dört profesyonel hesaplayıcı. Anında. Kayıt yok.",navRechner:"Hesaplayıcılar",navBauzinsen:"İpotek faizi",navFaq:"Nasıl çalışır",trustHead:"Neden Immofuchs?",trust1H:"Hukuka uygun",trust1P:"§ 558 BGB, GEG, GrEStG — tüm hesaplamalar Alman hukukuna göre.",trust2H:"Alman veri koruma",trust2P:"Almanya'da barındırma. İzleyici, çerez veya giriş yok.",trust3H:"Kayıt yok",trust3P:"Hemen başlayın. Veriler tarayıcınızda kalır, hiçbir şey saklanmaz.",trust4H:"Güncel veriler",trust4P:"İpotek faizleri aylık güncellenir, resmi kaynaklardan.",howShort:"3 adımda sonuç",navHow:"Nasıl çalışır",navZinsen:"İpotek faizleri",subShort:"Almanya'daki yatırımcılar ve ev sahipleri için dört ücretsiz hesaplayıcı.",heroCtaPrimary:"Hesaplamaya başla",heroCtaSecondary:"Nasıl çalışır?",heroBadgeLive:"Canlı veri",trust1:"100% ücretsiz",trust2:"Kayıt yok",trust3:"GDPR uyumlu",trust4:"Canlı piyasa verileri",cardsSub:"Her durum için dört uzman hesaplayıcı",dataEyebrow:"Tahmin yok",dataTitle:"Gerçek piyasa verileri. Akıllı hesaplayıcılar.",dataSub:"Diğer hesaplayıcılar sabit örnek değerler kullanırken Immofuchs güncel piyasa verilerini otomatik olarak çeker — hiçbir şey girmene gerek yok.",dataStand:"Tüm değerler aylık kontrol edilir — veri tarihi:",usp2H:"Hukuki referans yerleşik",usp2P:"§ 558 BGB, § 7 EStG, GEG 2024 — tüm ilgili yasalar her hesaplamada doğrudan.",usp4H:"Hemen başla",usp4P:"İndirme veya giriş gerekmez. Sadece aç ve hesapla — tüm alanlar gerçekçi değerlerle dolu.",usp5H:"%100 özel",usp5P:"Tüm hesaplamalar tarayıcıda çalışır. Sunucu, takip, reklam veya kayıt yok.",usp6H:"5 dil · PDF dışa aktarma",usp6P:"DE, EN, TR, ZH, HI mevcut. Tüm sonuçlar PDF olarak kaydedilebilir.",dc1L:"Ort. ipotek faizi",dc1S:"10 yıl sabit dönem",dc2L:"Kira fiyat tahmini",dc2S:"Federal İst. Ofisi",dc3L:"Değer artışı",dc3S:"Piyasa tahmini",dc4L:"Tapu vergisi",dc4S:"%3,5 – %6,5",dc4V:"eyalete göre",dc5L:"Kira tavanları",dc5S:"%15 / %20 otomatik",dc5V:"200+ şehir",dc6L:"KfW BEG teşvik",dc6S:"yatırım maliyetinin",dc6V:"%70'e kadar",dc7L:"CO₂ fiyatı",dc7S:"Federal Çevre Ajansı",dc7V:"55 €/ton",dc8L:"Amortisman oranı",dc8S:"§ 7 EStG",dc8V:"%2",dc9L:"BAFA teşvik",dc9S:"BEG tekil önlemler",dc9V:"aktif"},
  zh:{h1a:"智能",h1b:"分析房地产。",h1c:" 了解收益。正确决策。",sub:"德国投资者和房东的四个专业计算器。收益、融资、租赁法和装修 – 即时、实时、免费。",mockKauf:"购买价格",mockMiete:"月租金",mockZins:"利率",mockEK:"自有资金",mockBrutto:"毛收益",mockNetto:"净收益",mockRate:"月供",mockRateSub:"含 2% 还款",mockCF:"月现金流",mockCFSub:"扣除成本和月供后",mockChart:"现金流图表",ratesTitle:"当前抵押贷款利率",ratesDisclaim:"所有数据无担保。个人条件可能有所不同。",ratesStand:"截至",ratesIntro1:"10年期德国国债（BBK01.WT1010）目前为",ratesIntro2:"10年固定利率期间的抵押贷款利率市场概况：",ratesSoll:"标定利率",ratesAb:"从约",ratesSources:"来源",cardsTitle:"选择您的计算器",uspTitle:"Immofuchs 的特别之处",uspSub:"不仅仅是一个计算器",usp1H:"每日市场数据",usp1P:"联邦银行收益率、抵押贷款利率和 BEG 补贴配额自动集成。",usp3H:"州专属",usp3P:"房地产转让税、租金上限（15%/20%）和州开发银行按地区自动应用。",howTitle:"工作原理",step1H:"选择计算器",step1P:"选择合适的计算器 — 收益、贷款、租金或装修。",step2H:"输入数据",step2P:"购买价格、租金、利率 — 所有字段都预填了实际值。",step3H:"即时结果",step3P:"所有结果实时更新。无需注册、等待或付费。",fullTitle:"收益计算器",fullBadge:"收益",fullDesc:"最全面的计算器：收益、现金流、税收优惠、租赁法和风险分析。",fullF1:"毛租金收益和净租金收益",fullF2:"X 年后销售场景",fullF3:"AfA 和税收优惠",fullF4:"租金增加计划",fullF5:"风险分析和快速检查",fullF6:"邮编自动完成",fullCta:"打开收益计算器",finTitle:"贷款计算器",finBadge:"融资",finDesc:"月供、完整摊销计划和固定期后剩余债务。",finF1:"月年金",finF2:"额外付款和期限",finF3:"贷款价值比 (LTV)",finF4:"固定期后剩余债务",finF5:"还款比较",finF6:"购买附带成本",finCta:"打开贷款计算器",rentTitle:"租金上涨",rentBadge:"租赁法",rentDesc:"下次租金上涨何时可能，可以上涨多少，租金如何发展？",rentF1:"下次日期（§ 558 BGB）",rentF2:"租金上限 15%/20% 自动",rentF3:"参考租金作为上限",rentF4:"最多 20 年预测",rentF5:"识别 200 多个城市",rentF6:"法律基础",rentCta:"打开租金上涨",sanTitle:"装修计算器",sanBadge:"装修",sanDesc:"计算节能装修的成本、BEG 补贴、CO₂ 节省和回本期。",sanF1:"窗户、外墙、屋顶、供暖",sanF2:"高达 70% BEG 补贴",sanF3:"前/后能源等级",sanF4:"CO₂ 减排",sanF5:"回本计算",sanF6:"PV、电池和壁挂充电器",sanCta:"打开装修计算器",footerNote:"Immofuchs 是德国私人房地产投资者的独立免费工具。不提供法律或税务建议。",footerCr:"© 2026 immofuchs.info · 私人，非商业",imp:"法律声明",dse:"隐私",ratesCompact:"平均抵押利率",ratesTip:"10年固定利率期间市场指示。来源：Dr. Klein、Vergleich.de、Finanztip、Finanzfacts、Interhyp、德国联邦银行。2026 年 4 月。",ratesShort:"最优",ratesShort3:"联邦债券 10年",tagFull:"免费 · 无需注册 · 实时",ctaPrimary:"打开计算器",ctaSecondary:"工作原理",heroEyebrow:"免费 · 实时利率 · 无需注册",heroSubShort:"四个专业计算器。即时。无需注册。",navRechner:"计算器",navBauzinsen:"贷款利率",navFaq:"工作原理",trustHead:"为什么选择 Immofuchs？",trust1H:"合法合规",trust1P:"§ 558 BGB、GEG、GrEStG — 所有计算遵循德国法律。",trust2H:"德国数据保护",trust2P:"德国托管。无追踪器、无 Cookies、无登录。",trust3H:"无需注册",trust3P:"立即开始。数据保留在浏览器中，不会存储。",trust4H:"最新数据",trust4P:"贷款利率每月更新，所有数据来自官方来源。",howShort:"3 步获得结果",navHow:"工作原理",navZinsen:"抵押利率",subShort:"为德国投资者和房东提供四种免费计算器——回报、融资、租赁法、装修。即时、实时、无需注册。",heroCtaPrimary:"开始计算",heroCtaSecondary:"如何工作？",heroBadgeLive:"实时数据",trust1:"100% 免费",trust2:"无需注册",trust3:"符合 GDPR",trust4:"实时市场数据",cardsSub:"针对每种情况的四个专业计算器",dataEyebrow:"无估算",dataTitle:"真实市场数据。精心设计的计算器。",dataSub:"其他计算器使用固定示例值，而Immofuchs自动引入当前市场数据——无需手动输入。",dataStand:"所有数值每月核查——数据截至：",usp2H:"内置法律参考",usp2P:"§ 558 BGB、§ 7 EStG、GEG 2024 — 所有相关法律直接纳入每次计算。",usp4H:"立即开始",usp4P:"无需下载或登录。直接打开并计算——所有字段已预填实际值。",usp5H:"100% 私密",usp5P:"所有计算仅在浏览器中运行。没有服务器、跟踪、广告或注册。",usp6H:"5种语言 · PDF导出",usp6P:"提供DE、EN、TR、ZH、HI。所有结果可保存为PDF。",dc1L:"平均抵押利率",dc1S:"10年固定期",dc2L:"租金价格预测",dc2S:"联邦统计局",dc3L:"增值率",dc3S:"市场预测",dc4L:"房产转让税",dc4S:"3.5% – 6.5%",dc4V:"按联邦州",dc5L:"租金上限",dc5S:"15% / 20% 自动",dc5V:"200+ 城市",dc6L:"KfW BEG 补贴",dc6S:"投资成本的",dc6V:"高达 70%",dc7L:"CO₂价格",dc7S:"联邦环境署",dc7V:"55欧元/吨",dc8L:"折旧率",dc8S:"§ 7 EStG",dc8V:"2%",dc9L:"BAFA补贴",dc9S:"BEG单项措施",dc9V:"有效"},
  hi:{h1a:"रियल एस्टेट का ",h1b:"बुद्धिमानी से विश्लेषण करें।",h1c:" रिटर्न जानें। सही निर्णय लें।",sub:"जर्मनी में निवेशकों और मकान मालिकों के लिए चार पेशेवर कैलकुलेटर। रिटर्न, वित्तपोषण, किराया कानून और नवीनीकरण – तुरंत, रीयल-टाइम, मुफ्त।",mockKauf:"खरीद मूल्य",mockMiete:"मासिक किराया",mockZins:"ब्याज दर",mockEK:"स्वपूंजी",mockBrutto:"सकल रिटर्न",mockNetto:"शुद्ध रिटर्न",mockRate:"मासिक किस्त",mockRateSub:"2% चुकौती सहित",mockCF:"मासिक नकदी प्रवाह",mockCFSub:"लागत व किस्त के बाद",mockChart:"नकदी प्रवाह चार्ट",ratesTitle:"वर्तमान होम लोन दरें",ratesDisclaim:"सभी डेटा बिना गारंटी। व्यक्तिगत शर्तें भिन्न हो सकती हैं।",ratesStand:"तिथि",ratesIntro1:"10 वर्ष का जर्मन सरकारी बॉन्ड (BBK01.WT1010) वर्तमान में है",ratesIntro2:"10 वर्ष निश्चित दर अवधि के लिए होम लोन दरें बाज़ार अवलोकन:",ratesSoll:"नाममात्र",ratesAb:"लगभग",ratesSources:"स्रोत",cardsTitle:"अपना कैलकुलेटर चुनें",uspTitle:"Immofuchs को क्या खास बनाता है",uspSub:"केवल एक कैलकुलेटर से अधिक",usp1H:"दैनिक बाजार डेटा",usp1P:"बुंडेसबैंक रिटर्न, होम लोन दरें और BEG सब्सिडी कोटा स्वचालित रूप से एकीकृत।",usp3H:"राज्य-विशिष्ट",usp3P:"रियल एस्टेट हस्तांतरण कर, किराया सीमा और राज्य विकास बैंक स्थान के अनुसार स्वचालित रूप से लागू।",howTitle:"यह कैसे काम करता है",step1H:"कैलकुलेटर चुनें",step1P:"सही कैलकुलेटर चुनें — रिटर्न, ऋण, किराया या नवीनीकरण।",step2H:"डेटा दर्ज करें",step2P:"खरीद मूल्य, किराया, ब्याज — सभी फ़ील्ड यथार्थवादी मानों के साथ पूर्व-भरे हुए हैं।",step3H:"तुरंत परिणाम",step3P:"सभी परिणाम रीयल-टाइम में अपडेट होते हैं। पंजीकरण, प्रतीक्षा या लागत नहीं।",fullTitle:"रिटर्न कैलकुलेटर",fullBadge:"रिटर्न",fullDesc:"सबसे व्यापक कैलकुलेटर: रिटर्न, नकदी प्रवाह, कर लाभ, किराया कानून और जोखिम विश्लेषण।",fullF1:"सकल और शुद्ध किराया रिटर्न",fullF2:"X वर्षों के बाद बिक्री परिदृश्य",fullF3:"AfA और कर लाभ",fullF4:"किराया वृद्धि योजना",fullF5:"जोखिम विश्लेषण और त्वरित जांच",fullF6:"पिन कोड स्वत: पूर्णता",fullCta:"रिटर्न कैलकुलेटर खोलें",finTitle:"ऋण कैलकुलेटर",finBadge:"वित्तपोषण",finDesc:"मासिक भुगतान, पूर्ण परिशोधन योजना और निश्चित अवधि के बाद शेष ऋण।",finF1:"मासिक वार्षिकी",finF2:"अतिरिक्त भुगतान और अवधि",finF3:"ऋण-मूल्य अनुपात (LTV)",finF4:"निश्चित अवधि के बाद शेष ऋण",finF5:"भुगतान तुलना",finF6:"खरीद पक्ष लागत",finCta:"ऋण कैलकुलेटर खोलें",rentTitle:"किराया वृद्धि",rentBadge:"किराया कानून",rentDesc:"अगली किराया वृद्धि कब संभव है, कितना हो सकता है और किराया कैसे विकसित होता है?",rentF1:"अगली तिथि (§ 558 BGB)",rentF2:"किराया सीमा 15/20% ऑटो",rentF3:"संदर्भ किराया छत के रूप में",rentF4:"20 वर्षों तक पूर्वानुमान",rentF5:"200 से अधिक शहर पहचाने",rentF6:"कानूनी आधार",rentCta:"किराया वृद्धि खोलें",sanTitle:"नवीनीकरण कैलकुलेटर",sanBadge:"नवीनीकरण",sanDesc:"ऊर्जा-कुशल नवीनीकरण के लिए लागत, BEG सब्सिडी, CO₂ बचत और वापसी अवधि की गणना करें।",sanF1:"खिड़कियां, मुखौटा, छत, हीटिंग",sanF2:"70% तक BEG सब्सिडी",sanF3:"पहले/बाद ऊर्जा वर्ग",sanF4:"CO₂ कमी",sanF5:"वापसी गणना",sanF6:"PV, बैटरी और वॉलबॉक्स",sanCta:"नवीनीकरण कैलकुलेटर खोलें",footerNote:"Immofuchs जर्मनी में निजी रियल एस्टेट निवेशकों के लिए एक स्वतंत्र, मुफ्त उपकरण है। कानूनी या कर सलाह नहीं।",footerCr:"© 2026 immofuchs.info · निजी व्यक्ति, व्यवसाय नहीं",imp:"कानूनी सूचना",dse:"गोपनीयता",ratesCompact:"औसत होम लोन दर",ratesTip:"10 वर्ष निश्चित दर अवधि बाज़ार संकेत। स्रोत: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank। मई 2026।",ratesShort:"सर्वोत्तम",ratesShort3:"BBank 10Y",tagFull:"मुफ्त · बिना पंजीकरण · वर्तमान",ctaPrimary:"कैलकुलेटर खोलें",ctaSecondary:"यह कैसे काम करता है",heroEyebrow:"मुफ्त · लाइव दरें · कोई पंजीकरण नहीं",heroSubShort:"चार पेशेवर कैलकुलेटर। तुरंत। बिना पंजीकरण।",navRechner:"कैलकुलेटर",navBauzinsen:"होम लोन दरें",navFaq:"कैसे काम करता है",trustHead:"Immofuchs क्यों?",trust1H:"कानूनी रूप से अनुपालन",trust1P:"§ 558 BGB, GEG, GrEStG — सभी गणनाएं जर्मन कानून के अनुसार।",trust2H:"जर्मन डेटा सुरक्षा",trust2P:"जर्मन होस्टिंग। कोई ट्रैकर नहीं, कुकीज़ नहीं, लॉगिन नहीं।",trust3H:"कोई पंजीकरण नहीं",trust3P:"तुरंत शुरू करें। डेटा आपके ब्राउज़र में रहता है, कुछ भी संग्रहीत नहीं।",trust4H:"अद्यतन डेटा",trust4P:"होम लोन दरें मासिक अपडेट, सभी मूल्य आधिकारिक स्रोतों से।",howShort:"3 चरणों में परिणाम",navHow:"यह कैसे काम करता है",navZinsen:"बंधक दरें",subShort:"जर्मनी में निवेशकों और मकान मालिकों के लिए चार मुफ्त कैलकुलेटर।",heroCtaPrimary:"गणना शुरू करें",heroCtaSecondary:"यह कैसे काम करता है?",heroBadgeLive:"लाइव डेटा",trust1:"100% मुफ़्त",trust2:"बिना पंजीकरण",trust3:"GDPR-अनुपालक",trust4:"लाइव बाज़ार डेटा",cardsSub:"हर स्थिति के लिए चार विशेष कैलकुलेटर",dataEyebrow:"कोई अनुमान नहीं",dataTitle:"वास्तविक बाजार डेटा। सुविचारित कैलकुलेटर।",dataSub:"जबकि अन्य कैलकुलेटर निश्चित उदाहरण मानों का उपयोग करते हैं, Immofuchs स्वचालित रूप से वर्तमान बाजार डेटा खींचता है।",dataStand:"सभी मान मासिक जांचे जाते हैं — डेटा स्थिति:",usp2H:"कानूनी संदर्भ अंतर्निहित",usp2P:"§ 558 BGB, § 7 EStG, GEG 2024 — सभी प्रासंगिक कानून हर गणना में।",usp4H:"तुरंत शुरू करें",usp4P:"कोई डाउनलोड या लॉगिन नहीं। बस खोलें और गणना करें।",usp5H:"100% निजी",usp5P:"सभी गणनाएं ब्राउज़र में चलती हैं। कोई सर्वर, ट्रैकिंग, विज्ञापन या पंजीकरण नहीं।",usp6H:"5 भाषाएं · PDF निर्यात",usp6P:"DE, EN, TR, ZH, HI उपलब्ध। सभी परिणाम PDF के रूप में सहेजे जा सकते हैं।",dc1L:"औसत बंधक दर",dc1S:"10 वर्ष निश्चित अवधि",dc2L:"किराया मूल्य पूर्वानुमान",dc2S:"संघीय सांख्यिकी कार्यालय",dc3L:"मूल्य वृद्धि",dc3S:"बाजार पूर्वानुमान",dc4L:"हस्तांतरण कर",dc4S:"3.5% – 6.5%",dc4V:"प्रत्येक राज्य के अनुसार",dc5L:"किराया सीमाएं",dc5S:"15% / 20% स्वचालित",dc5V:"200+ शहर",dc6L:"KfW BEG सब्सिडी",dc6S:"निवेश लागत का",dc6V:"70% तक",dc7L:"CO₂ मूल्य",dc7S:"संघीय पर्यावरण एजेंसी",dc7V:"55€/टन",dc8L:"मूल्यह्रास दर",dc8S:"§ 7 EStG",dc8V:"2%",dc9L:"BAFA सब्सिडी",dc9S:"BEG एकल उपाय",dc9V:"सक्रिय"},
};

// Marktdaten → src/data.js


const Ctx=createContext();
const useApp=()=>useContext(Ctx);
const fmt=(v,d=0)=>(v==null||isNaN(v)||!isFinite(v))?"—":v.toLocaleString("de-DE",{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtE=v=>fmt(v)+" €";const fmtP=(v,d=1)=>fmt(v,d)+" %";
const LANG_LOCALE={de:"de-DE",en:"en-GB",tr:"tr-TR",zh:"zh-CN",hi:"hi-IN"};
const fmtDat=(d,lang="de")=>d instanceof Date?d.toLocaleDateString(LANG_LOCALE[lang]||"de-DE",{year:"numeric",month:"2-digit"}):"—";

// ── Ampelbewertung ───────────────────────────────────────────────────────────
// Gibt {color, dot} zurück. dot = farbiger Punkt-Indikator.
const AMPEL={
  bruttoR:   v=>v>=5?"#22c55e":v>=4?"#f59e0b":"#ef4444",
  nettoR:    v=>v>=3.5?"#22c55e":v>=2.5?"#f59e0b":"#ef4444",
  cfOhne:    v=>v>0?"#22c55e":v>=-100?"#f59e0b":"#ef4444",
  cfMit:     v=>v>0?"#22c55e":v>=-100?"#f59e0b":"#ef4444",
  bel:       v=>v<70?"#22c55e":v<85?"#f59e0b":"#ef4444",
  lz:        v=>!isFinite(v)||v>35?"#ef4444":v>25?"#f59e0b":"#22c55e",
};
function Dot({color}){return <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:color,marginLeft:5,flexShrink:0,verticalAlign:"middle"}} title={color==="#22c55e"?"Gut":color==="#f59e0b"?"Mittelmäßig":"Kritisch"}/>}
const addM=(d,m)=>{const r=new Date(d);r.setMonth(r.getMonth()+m);return r};
const addY=(d,y)=>{const r=new Date(d);r.setFullYear(r.getFullYear()+y);return r};

function F({label,unit,value,onChange,type="number",step,readOnly,hint,tip,placeholder,children}){
  const isNum=type==="number";
  const dv=isNum&&!readOnly&&value!=null?String(value).replace(".",","):value;
  const hc=e=>{const v=e.target.value;onChange?.(isNum&&!readOnly?v.replace(",","."):v)};
  return <div className="if-field" style={{marginBottom:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:8,flexWrap:"wrap"}}>
      <label style={{fontSize:15,color:"var(--cl)",fontWeight:500,marginBottom:5,display:"inline-flex",alignItems:"center"}}>{label}{tip&&<Tip text={tip}/>}</label>
      {hint&&<span style={{fontSize:12,color:"var(--ch)"}}>{hint}</span>}
    </div>
    {children||<div style={{display:"flex",alignItems:"center",background:readOnly?"var(--cro)":"var(--ci)",border:"1px solid var(--cb)",borderRadius:10,overflow:"hidden",minHeight:46}}>
      <input
        type={isNum?"text":type}
        inputMode={isNum?"decimal":undefined}
        value={dv}
        onChange={hc}
        readOnly={readOnly}
        placeholder={placeholder||""}
        style={{flex:1,minWidth:0,border:"none",outline:"none",padding:"12px 14px",fontSize:18,background:"transparent",color:readOnly?"var(--ch)":"var(--ct)",fontFamily:"inherit",fontVariantNumeric:"tabular-nums"}}/>
      {unit&&<span style={{padding:"0 12px 0 0",fontSize:14,color:"var(--ch)",whiteSpace:"nowrap"}}>{unit}</span>}
    </div>}
  </div>;
}
function Sel({label,value,onChange,options}){return <F label={label}><select value={value} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"12px 14px",fontSize:18,border:"1px solid var(--cb)",borderRadius:10,background:"var(--ci)",color:"var(--ct)",fontFamily:"inherit",minHeight:46}}>{options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></F>}
function Row({children}){return <div className="if-row">{children}</div>}
function Sec({title,icon}){return <div style={{display:"flex",alignItems:"center",gap:8,margin:"24px 0 14px",paddingBottom:8,borderBottom:"1px solid var(--cb)"}}><span style={{fontSize:18}}>{icon}</span><span style={{fontSize:16,fontWeight:600,color:"var(--ct)"}}>{title}</span></div>}
function KPI({label,value,sub,accent}){return <div style={{background:accent?"var(--ca-bg)":"var(--cc)",borderRadius:12,padding:"14px",border:`1px solid ${accent?"var(--ca-bd)":"var(--cb)"}`}}><div style={{fontSize:11,color:accent?"var(--ca)":"var(--ch)",fontWeight:500,textTransform:"uppercase",letterSpacing:.8}}>{label}</div><div style={{fontSize:20,fontWeight:700,color:accent?"var(--ca)":"var(--ct)",marginTop:3,fontVariantNumeric:"tabular-nums"}}>{value}</div>{sub&&<div style={{fontSize:11,color:"var(--ch)",marginTop:2}}>{sub}</div>}</div>}
function SelbsttraegerCheck({R}){
  const{t}=useApp();
  if(!R||!R.ann||R.ann===0||!R.da||R.da===0)return null;
  // template-helper: replaces {key} placeholders
  const tpl=(s,v)=>s.replace(/\{(\w+)\}/g,(_,k)=>v[k]??'');
  // Verhandlungs-KP: gKP bei dem monatl. CF ohne Steuer = 0
  const beqKP=Math.round(R.gKP+R.cf2OhneSt*R.da/R.ann);
  const diffKP=R.gKP-beqKP;
  const pctNeed=R.gKP>0?diffKP/R.gKP*100:0;
  const beqKPMit=Math.round(R.gKP+R.cf2MitSt*R.da/R.ann);
  const diffKPMit=R.gKP-beqKPMit;
  const beqJ=R.cf2OhneSt>=0?1:(R.yearRows||[]).find(r=>(r.cfOhneSt??r.cf-r.steuer)>=0)?.j??null;

  const alreadyOhne=R.cf2OhneSt>=0;
  const alreadyMit=!alreadyOhne&&R.cf2MitSt>=0;
  const smallGap=!alreadyOhne&&pctNeed<=12;
  const hasBeqJ=!alreadyOhne&&beqJ!==null;

  const heroColor=alreadyOhne?"#15803d":alreadyMit?"#0369a1":smallGap||hasBeqJ?"#b45309":"#b91c1c";
  const heroBg=alreadyOhne?"#F0FAF3":alreadyMit?"#EFF6FF":smallGap||hasBeqJ?"#FFFBEB":"#FFF5F5";
  const heroBorder=alreadyOhne?"#86EFAC":alreadyMit?"#BFDBFE":smallGap||hasBeqJ?"#FDE68A":"#FECACA";

  const heroText=(()=>{
    if(alreadyOhne)return t.stHero1;
    if(alreadyMit)return tpl(t.stHero2,{cf:fmtE(R.cf2MitSt),diff:fmtE(Math.abs(R.cf2OhneSt))});
    if(smallGap)return tpl(t.stHero3,{diff:fmtE(diffKP),pct:fmtP(pctNeed,1),kp:fmtE(beqKP)});
    if(hasBeqJ)return tpl(t.stHero4a,{j:beqJ,kp:fmtE(beqKP)});
    return tpl(t.stHero4b,{kp:fmtE(beqKP),diff:fmtE(diffKP)});
  })();

  return(
    <div style={{background:heroBg,borderRadius:14,border:`2px solid ${heroBorder}`,padding:"16px 18px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <span style={{fontSize:16}}>{alreadyOhne?"🏆":alreadyMit?"✅":smallGap?"🎯":"📊"}</span>
        <span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:heroColor}}>{t.stCheck}</span>
      </div>
      <div style={{fontSize:14,fontWeight:600,color:heroColor,lineHeight:1.55,marginBottom:14}}>
        {heroText}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        <div style={{background:"rgba(255,255,255,0.7)",borderRadius:10,padding:"12px 14px",border:`1px solid ${heroBorder}`}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,color:"var(--ch)",marginBottom:4}}>
            {t.stZielKP}
          </div>
          <div style={{fontSize:22,fontWeight:800,color:heroColor,fontVariantNumeric:"tabular-nums",letterSpacing:-.5}}>
            {fmtE(beqKP)}
          </div>
          <div style={{fontSize:11,fontWeight:600,color:heroColor,marginTop:4}}>
            {alreadyOhne
              ?`✓ ${fmtE(diffKP)} ${t.stIstKPPuffer}`
              :diffKP>0
                ?`▼ ${fmtE(diffKP)} (${fmtP(pctNeed,1)}) ${t.stVerhandlZiel}`
                :`✓ ${t.stMitStVor.split(' ')[0]} ${fmtE(Math.abs(diffKP))} ${t.stUnterZiel}`
            }
          </div>
          {!alreadyOhne&&(
            <div style={{fontSize:10,color:"var(--ch)",marginTop:4,paddingTop:4,borderTop:`1px solid ${heroBorder}`}}>
              {t.stMitStVor}: {fmtE(beqKPMit)}{diffKPMit>0?` (−${fmtE(diffKPMit)})`:` ✓`}
            </div>
          )}
        </div>
        <div style={{background:"rgba(255,255,255,0.7)",borderRadius:10,padding:"12px 14px",border:`1px solid ${heroBorder}`}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:.8,color:"var(--ch)",marginBottom:4}}>
            {t.stSelbstAb}
          </div>
          <div style={{fontSize:22,fontWeight:800,color:alreadyOhne?"#15803d":beqJ?"#b45309":"#b91c1c",fontVariantNumeric:"tabular-nums",letterSpacing:-.5}}>
            {alreadyOhne?t.stSofort:beqJ?`Jahr ${beqJ}`:t.stAusserhalb}
          </div>
          <div style={{fontSize:11,fontWeight:600,color:alreadyOhne?"#15803d":beqJ?"#b45309":"#b91c1c",marginTop:4}}>
            {alreadyOhne?t.stCFPositiv
              :beqJ?`CF ≥ 0 ab J${beqJ} (${t.stMietSteig})`
              :`${t.stAusserhalb} ${R.j}-J.-Analyse`}
          </div>
          <div style={{fontSize:10,color:"var(--ch)",marginTop:4,paddingTop:4,borderTop:`1px solid ${heroBorder}`}}>
            {t.stOhneStAkt}
          </div>
        </div>
      </div>
    </div>
  );
}
// Legacy-Alias für Rückwärtskompatibilität
const BreakEvenCards=SelbsttraegerCheck;
function Ins({emoji,text,type="info"}){const bg={info:"#EBF5FF",good:"#E8F8EE",warn:"#FFF8E6",bad:"#FFF0F0"}[type];const tc={info:"#1a5fa0",good:"#1a7a3a",warn:"#8a6d10",bad:"#9a2020"}[type];return <div style={{display:"flex",gap:8,alignItems:"flex-start",padding:"10px 12px",background:bg,borderRadius:8,marginBottom:6}}><span style={{fontSize:14,flexShrink:0}}>{emoji}</span><span style={{fontSize:12,color:tc,lineHeight:1.5}}>{text}</span></div>}
function RBar({score,factors}){const{t}=useApp();const col=score<25?"#22c55e":score<50?"#f59e0b":score<75?"#ef4444":"#b91c1c";const lbl=score<25?t.niedrig:score<50?t.mittel:t.hoch;
  const[ex,setEx]=useState(false);
  return <div style={{background:"var(--cc)",borderRadius:12,padding:"12px",border:"1px solid var(--cb)",marginBottom:12}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
      <span style={{fontSize:11,fontWeight:600,color:"var(--ct)"}}>{t.risk}</span>
      <span style={{fontSize:13,fontWeight:700,color:col}}>{score}/100 — {lbl}</span>
    </div>
    <div style={{height:8,borderRadius:4,background:"var(--cb)",overflow:"hidden",marginBottom:4}}>
      <div style={{height:"100%",borderRadius:4,transition:"width .5s",width:`${Math.min(100,score)}%`,background:`linear-gradient(90deg,${score<25?"#22c55e":"#f59e0b"},${col})`}}/>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"var(--ch)"}}><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
    {factors&&factors.length>0&&<>
      <button onClick={()=>setEx(!ex)} style={{marginTop:8,background:"none",border:"none",fontSize:10,color:"var(--ch)",cursor:"pointer",padding:0,fontFamily:"inherit"}}>{ex?t.riskHide:t.riskShow+"("+factors.length+")"}</button>
      {ex&&<div style={{marginTop:6,fontSize:10,color:"var(--cl)",lineHeight:1.8}}>{factors.map((f,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:4}}><span style={{color:"#ef4444"}}>●</span>{f}</div>)}</div>}
    </>}
  </div>}

function PLZSearch({showKapp=true}={}){const{d,set,t,tip}=useApp();const[ac,setAC]=useState([]);const[show,setShow]=useState(false);const ref=useRef();
  const onP=v=>{set("plz",v);if(/^\d{5}$/.test(v)){const f=PLZ_DB.byPlz[v];if(f){set("ort",f.ort);set("bundesland",f.bl)}}};
  const onO=v=>{set("ort",v);if(v.length>=2){const l=v.toLowerCase();const m=PLZ_DB.allOrts.filter(o=>o.startsWith(l)).slice(0,6);setAC(m.map(o=>PLZ_DB.byOrt[o][0]));setShow(m.length>0)}else setShow(false)};
  const sel=it=>{set("ort",it.ort);set("plz",it.plz);set("bundesland",it.bl);setShow(false)};
  useEffect(()=>{const c=e=>{if(ref.current&&!ref.current.contains(e.target))setShow(false)};document.addEventListener("click",c);return()=>document.removeEventListener("click",c)},[]);
  const kp=isK15(d.ort)||d.bundesland==="BE"||d.bundesland==="HH"?15:20;
  return <><Row><F label={t.plz} value={d.plz} onChange={onP} type="text" hint={PLZ_DB.byPlz[d.plz]?.ort||""}/><div ref={ref} style={{position:"relative"}}><F label={t.ort} value={d.ort} onChange={onO} type="text"/>{show&&<div style={{position:"absolute",top:"100%",left:0,right:0,background:"var(--cc)",border:"1px solid var(--cb)",borderRadius:8,zIndex:50,boxShadow:"0 4px 12px rgba(0,0,0,.1)",maxHeight:180,overflow:"auto"}}>{ac.map((it,i)=><div key={i} onClick={()=>sel(it)} style={{padding:"8px 12px",fontSize:13,cursor:"pointer",borderBottom:"1px solid var(--cb)"}}>{it.ort} <span style={{color:"var(--ch)",fontSize:11}}>{it.plz}·{BL_N[it.bl]}</span></div>)}</div>}</div></Row>
  {showKapp&&d.ort&&<div style={{fontSize:11,padding:"6px 10px",background:kp===15?"#FFF0F0":"#E8F8EE",borderRadius:6,marginBottom:10,color:kp===15?"#9a2020":"#1a7a3a"}}>{t.kapp}: {kp}% — {kp===15?t.ang:t.std} ({d.ort})</div>}</>}

function buildMP(miete,qm,vmQm,kappP,lD,lM,jahre,k15,tObj){const vm=vmQm>0?vmQm*qm:null,prog=k15?MIET_P.kapp15:MIET_P.normal,vmPA=prog.pA/100,heute=new Date(),ende=addY(heute,jahre);let akt=miete,lInc=lD?new Date(lD):new Date(heute.getFullYear()-2,heute.getMonth(),1);const hist=[];if(lD&&lM>0&&lM<miete)hist.push({date:new Date(lD),fromM:lM,toM:miete});const rows=[];let sg=0;while(sg++<20){const n=addM(lInc,15);if(n>ende)break;const f3=addM(n,-36),used=hist.filter(h=>h.date>=f3&&h.date<n).reduce((s,h)=>s+(h.fromM>0?(h.toM-h.fromM)/h.fromM*100:0),0),vK=Math.max(0,kappP-used),mxK=akt*(1+vK/100),j2D=(n-heute)/(1e3*60*60*24*365.25),vP=vm?vm*Math.pow(1+vmPA,j2D):null,mxM=vP?Math.min(mxK,vP):mxK,mE=Math.max(0,mxM-akt),mP=akt>0?mE/akt*100:0,neu=akt+mE;let st,sC;if(vP&&akt>=vP-.5){st=(tObj||{vgl:"Vgl."}).vgl;sC="neg"}else if(vK<=.1){st=(tObj||{kapp:"Kap."}).kapp;sC="neg"}else{st=`+${fmt(mP,1)}%`;sC="pos"}rows.push({datum:n,aktMiete:akt,vm,vmProg:vP,mE,mP,neueMiete:neu,verfK:vK,status:st,sC});if(mE>0){hist.push({date:new Date(n),fromM:akt,toM:neu});akt=neu}lInc=new Date(n)}return{rows,q:prog.q,vmPA:prog.pA}}
function VT({view,setView}){const{t}=useApp();return <div className="mob-toggle">{["input","result"].map(v=><button key={v} className={view===v?"act":""} onClick={()=>{setView(v);setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),50)}}>{v==="input"?t.eingabe:t.ergebnis}</button>)}</div>}



// ═══ TOOLTIPS, LEGAL BASIS & SHARED COMPONENTS ═══
const TIPS={
  de:{
    kaufpreis:"Vereinbarter Kaufpreis ohne Kaufnebenkosten.",
    flaeche:"Nettowohnfläche nach Wohnflächenverordnung (WoFlV).",
    kaltmiete:"Nettokaltmiete ohne Betriebskosten.",
    nichtUml:"Kosten, die nicht auf Mieter umlegbar sind: Verwaltung, Instandhaltung, Rücklagen.",
    leerstand:"Erwartete Leerstandsmonate im Analysezeitraum. Realistisch: 2-4 Monate pro 10 Jahre.",
    eigenkapital:"Liquide Mittel für Kauf. Faustregel: mind. Kaufnebenkosten + 20% des Kaufpreises.",
    zinssatz:`Sollzins p.a. (nicht Effektivzins). Aktueller Marktdurchschnitt: ${MARKET_RATES.avg} % (Stand ${MARKET_RATES.stand}). Quellen: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank.`,
    tilgung:"Anfängliche Tilgung p.a. Empfehlung: mind. 2-3% für vertretbare Laufzeit.",
    grEst:"Grunderwerbsteuer nach GrEStG - bundeslandabhängig 3,5%-6,5%.",
    notar:"Notar- und Grundbuchkosten, ca. 1,5-2% des Kaufpreises.",
    makler:"Maklerprovision - seit 12/2020 geteilt zwischen Käufer und Verkäufer (max. 3,57%).",
    steuersatz:"Persönlicher Durchschnittssteuersatz. Berechnung: (Einkommensteuer ÷ zvE) × 100. Werte im Steuerbescheid. Grenzsteuersatz inkl. Soli typisch 25–45 %.",
    afa:"Absetzung für Abnutzung (§ 7 EStG). 2% linear für Baujahr ab 1925, 3% für Neubau ab 2023.",
    grundAnteil:"Nicht abschreibbar. Typisch 20% in Städten, 10-15% auf dem Land.",
    gebAnteil:"Gebäudewert - abschreibbar gemäß AfA-Satz.",
    wertP:"Historische Wertsteigerung 2-3% p.a. (langfristig). Regional stark variabel.",
    sonder:"Einmalige Sonderumlagen der WEG, z.B. neue Heizung, neues Dach, Fassadensanierung, Aufzug. Vor Kauf Protokolle der Eigentümerversammlungen prüfen.",
    renovierung:"Geschätzte Renovierungskosten beim Kauf (Küche, Bad, Böden etc.). Wichtig: Übersteigen diese Kosten in den ersten 3 Jahren nach Kauf 15% des Gebäude-Kaufpreises (Kaufpreis × Gebäudeanteil), müssen sie als 'anschaffungsnahe Herstellungskosten' aktiviert und über die AfA abgeschrieben werden (§ 6 Abs. 1 Nr. 1a EStG) — kein Sofortabzug. Kein Steuerrechtsrat — Steuerberater hinzuziehen.",
    vgl:"Ortsübliche Vergleichsmiete pro m² (Mietspiegel, Mietdatenbank oder Gutachter).",
    lDat:"Datum der letzten vertragswirksamen Mieterhöhung. 15-Monatsfrist nach § 558 BGB.",
    lMiet:"Miete VOR der letzten Erhöhung (für Kappungsgrenze-Berechnung).",
    bj:"Baujahr der Immobilie (Bezugsfertigkeit). Bestimmt Energiestandard.",
    pers:"Personen im Haushalt - bestimmt Warmwasserbedarf (~800 kWh/Person/J.).",
    garage:"Kaufpreis für Garage oder Stellplatz, separat vom Wohnungsbereich. Nebenkosten werden auf Gesamtpreis berechnet.",
    mieteQm:"Kaltmiete pro m² Wohnfläche. Multipliziert mit Wohnfläche ergibt die monatliche Kaltmiete.",
    ogdecke:"Dämmung der obersten Geschossdecke — kostengünstige Alternative zur kompletten Dachsanierung.",
    batterie:"Kapazität des Batteriespeichers in kWh. Faustregel: Kapazität ≈ PV-Leistung in kWp.",
    sondertilg:"Jährliche Sondertilgung - üblich 5% des Darlehensbetrags/Jahr. Muss vertraglich vereinbart sein (§ 500 BGB).",
    epStrom:"Aktueller Strompreis pro kWh. Bundesdurchschnitt ca. 0,35 €/kWh (2025). Relevant für Wärmepumpe, PV, E-Auto.",
    epHeiz:"Heizkosten pro kWh für Gas, Öl, Pellets, Fernwärme. Gas ca. 0,12 €, Öl ca. 0,10 €, Pellets ca. 0,07 €, Fernwärme ca. 0,12 €.",
    fasFl:"Geschätzte Außenwandfläche. Abhängig von Anbausituation.",
    daFl:"Satteldach: ca. Grundfläche × 1.4, Flachdach: ≈ Grundfläche.",
    keFl:"Fläche der Kellerdecke. Bei unbeheiztem Keller empfehlenswert.",
    pvLeistung:"1 kWp ≈ 7m² Dachfläche. Ertrag ca. 950 kWh/kWp pro Jahr."
  },
  en:{
    kaufpreis:"Agreed purchase price excluding closing costs.",
    flaeche:"Net living area per German WoFlV regulation.",
    kaltmiete:"Net cold rent excluding utilities.",
    nichtUml:"Costs not chargeable to tenants: management, maintenance, reserves.",
    leerstand:"Expected vacancy months over the analysis period. Realistic: 2-4 months per 10 years.",
    eigenkapital:"Liquid funds for purchase. Rule of thumb: at least closing costs + 20% of purchase price.",
    zinssatz:`Nominal rate p.a. (not APR). Current market average: ${MARKET_RATES.avg}% (as of ${MARKET_RATES.stand}). Sources: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank.`,
    tilgung:"Initial annual repayment rate. Recommend: at least 2-3% for reasonable term.",
    grEst:"Real estate transfer tax (GrEStG) — varies 3.5%-6.5% by German state.",
    notar:"Notary and land registry costs, approx. 1.5-2% of purchase price.",
    makler:"Realtor commission — since 12/2020 shared between buyer and seller (max. 3.57%).",
    steuersatz:"Personal average tax rate. Formula: (income tax ÷ taxable income) × 100. Values in your tax assessment. Marginal rate incl. solidarity surcharge typically 25–45 %.",
    afa:"Depreciation per § 7 German Income Tax Act. 2% linear from 1925, 3% for new builds from 2023.",
    grundAnteil:"Not depreciable. Typically 20% in cities, 10-15% rural.",
    gebAnteil:"Building value — depreciable per AfA rate.",
    wertP:"Historical appreciation 2-3% p.a. long-term. Strong regional variation.",
    sonder:"One-time HOA special levies, e.g. new heating, roof, facade renovation, elevator. Review HOA meeting minutes before buying.",
    renovierung:"Estimated renovation costs at purchase (kitchen, bathroom, flooring etc.). Important: if costs exceed 15% of building purchase price within 3 years (§ 6 para. 1 no. 1a EStG), they must be capitalised and depreciated — no immediate deduction. Not tax advice — consult a tax advisor.",
    vgl:"Local comparable rent per m² (rent index, rent database, or appraiser).",
    lDat:"Date of last contractually effective rent increase. 15-month wait per § 558 BGB.",
    lMiet:"Rent BEFORE the last increase (for cap calculation).",
    bj:"Year of construction (occupancy ready). Determines energy standard.",
    pers:"Persons in household — determines hot water demand (~800 kWh/person/yr).",
    garage:"Price for garage or parking space, separate from living area. Closing costs are calculated on total price.",
    mieteQm:"Cold rent per m² living area. Multiplied by area equals monthly cold rent.",
    ogdecke:"Insulation of top floor ceiling — cost-effective alternative to full roof renovation.",
    batterie:"Battery storage capacity in kWh. Rule of thumb: capacity ≈ PV power in kWp.",
    sondertilg:"Annual special repayment - typically 5% of loan/year. Must be contractually agreed (§ 500 BGB).",
    epStrom:"Current electricity price per kWh. German average approx. 0.35 €/kWh (2025). Relevant for heat pumps, PV, EVs.",
    epHeiz:"Heating cost per kWh for gas, oil, pellets, district heating. Gas ~0.12 €, oil ~0.10 €, pellets ~0.07 €, district heating ~0.12 €.",
    fasFl:"Estimated facade area. Depends on attachment situation.",
    daFl:"Gable roof: ~ground area × 1.4, flat roof: ≈ ground area.",
    keFl:"Area of basement ceiling. Recommended for unheated basements.",
    pvLeistung:"1 kWp ≈ 7m² roof area. Yield ~950 kWh/kWp per year."
  },
  tr:{
    kaufpreis:"Kapanış maliyetleri hariç anlaşılan satın alma fiyatı.",
    flaeche:"Alman WoFlV yönetmeliğine göre net yaşam alanı.",
    kaltmiete:"İşletme giderleri hariç net soğuk kira.",
    nichtUml:"Kiracılara yüklenemeyen maliyetler: yönetim, bakım, rezerv.",
    leerstand:"Analiz dönemi boyunca beklenen boş ay sayısı. Gerçekçi: 10 yılda 2-4 ay.",
    eigenkapital:"Satın alma için likit fonlar. Kural: en az kapanış maliyetleri + alım fiyatının %20'si.",
    zinssatz:`Yıllık nominal faiz (efektif faiz değil). Güncel piyasa ortalaması: %${MARKET_RATES.avg} (${MARKET_RATES.stand} itibariyle). Kaynaklar: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank.`,
    tilgung:"Yıllık başlangıç anapara ödemesi. Tavsiye: makul vade için en az %2-3.",
    grEst:"Almanya'da emlak alım vergisi (GrEStG) - eyalete göre %3,5-6,5.",
    notar:"Noter ve tapu kayıt maliyetleri, satın alma fiyatının yaklaşık %1,5-2'si.",
    makler:"Emlakçı komisyonu - 12/2020'den beri alıcı ile satıcı arasında paylaşılır (maks. %3,57).",
    steuersatz:"Dayanışma vergisi dahil kişisel marjinal vergi oranı (tipik %25-42).",
    afa:"Almanya Gelir Vergisi Kanunu § 7'ye göre amortisman. 1925'ten itibaren doğrusal %2, 2023'ten itibaren yeni yapılarda %3.",
    grundAnteil:"Amortisman yok. Şehirlerde tipik %20, kırsalda %10-15.",
    gebAnteil:"Bina değeri - AfA oranına göre amortismana tabi.",
    wertP:"Tarihsel değer artışı uzun vadede yıllık %2-3. Bölgesel olarak çok değişken.",
    sonder:"Tek seferlik kat malikleri özel ödemeleri, örn. yeni ısıtma, çatı, cephe yenileme, asansör. Satın almadan önce kat malikleri toplantı tutanaklarını inceleyin.",
    renovierung:"Satın alımda tahmini tadilat maliyetleri. %15 eşiği aşılırsa aktifleştirme zorunludur.",
    vgl:"m² başına yerel karşılaştırmalı kira (kira endeksi, veritabanı veya bilirkişi).",
    lDat:"Son sözleşme bazında geçerli kira artışı tarihi. § 558 BGB'ye göre 15 ay bekleme.",
    lMiet:"Son artıştan ÖNCEKİ kira (kap hesaplaması için).",
    bj:"İnşaat yılı (oturuma hazır). Enerji standardını belirler.",
    pers:"Hanedeki kişi sayısı - sıcak su talebini belirler (kişi başı yıllık ~800 kWh).",
    garage:"Garaj veya park yeri için fiyat, yaşam alanından ayrı. Kapanış maliyetleri toplam fiyat üzerinden hesaplanır.",
    mieteQm:"m² yaşam alanı başına soğuk kira. Alanla çarpılınca aylık soğuk kira çıkar.",
    ogdecke:"Üst kat tavanı yalıtımı - tam çatı yenilemesine maliyet etkin alternatif.",
    batterie:"kWh cinsinden batarya depolama kapasitesi. Kural: kapasite ≈ kWp cinsinden PV gücü.",
    sondertilg:"Yıllık özel geri ödeme - tipik kredinin yıllık %5'i. Sözleşmeye göre kararlaştırılmalı (§ 500 BGB).",
    epStrom:"kWh başına güncel elektrik fiyatı. Almanya ortalaması yaklaşık 0,35 €/kWh (2025). Isı pompası, PV, elektrikli araç için önemli.",
    epHeiz:"Gaz, yağ, pelet, bölge ısıtması için kWh başına ısıtma maliyeti. Gaz ~0,12 €, yağ ~0,10 €, pelet ~0,07 €, bölge ısıtması ~0,12 €.",
    fasFl:"Tahmini cephe alanı. Eklenti durumuna bağlı.",
    daFl:"Beşik çatı: ~zemin alanı × 1.4, düz çatı: ≈ zemin alanı.",
    keFl:"Bodrum tavanı alanı. Isıtılmamış bodrumlar için önerilir.",
    pvLeistung:"1 kWp ≈ 7m² çatı alanı. Yıllık verim ~950 kWh/kWp."
  },
  zh:{
    kaufpreis:"商定的购买价格，不含交易费用。",
    flaeche:"根据德国 WoFlV 法规的净居住面积。",
    kaltmiete:"不含运营费用的净冷租金。",
    nichtUml:"不能向租户收取的费用：管理、维护、储备金。",
    leerstand:"分析期内预期空置月数。现实值：每10年2-4个月。",
    eigenkapital:"购买的流动资金。经验法则：至少交易费用 + 购买价的20%。",
    zinssatz:`年度名义利率（非有效利率）。当前市场平均水平：${MARKET_RATES.avg}%（截至 ${MARKET_RATES.stand}）。来源：Dr. Klein、Vergleich.de、Finanztip、Finanzfacts、Interhyp、德国联邦银行。`,
    tilgung:"年度初始还款率。建议：至少2-3%以获得合理期限。",
    grEst:"房地产转让税（GrEStG）- 各州 3.5%-6.5%。",
    notar:"公证和土地登记费用，约购买价的1.5-2%。",
    makler:"房地产经纪人佣金 - 自2020年12月起在买方和卖方之间分摊（最多3.57%）。",
    steuersatz:"包括团结附加税的个人边际税率（通常 25-42%）。",
    afa:"按德国所得税法第 7 条折旧。1925 年起线性 2%，2023 年起新建筑 3%。",
    grundAnteil:"不可折旧。城市通常20%，农村10-15%。",
    gebAnteil:"建筑价值 - 按 AfA 率折旧。",
    wertP:"长期历史增值年度 2-3%。地区差异很大。",
    sonder:"一次性物业特别征收，例如新供暖、屋顶、外墙翻新、电梯。购买前查阅业主大会会议记录。",
    renovierung:"购房时的预估装修费用。如超过建筑购价的15%则必须资本化。",
    vgl:"每平方米当地参考租金（租金指数、租金数据库或评估师）。",
    lDat:"最后一次合同生效租金上调日期。德国民法典第558条要求等待15个月。",
    lMiet:"最后一次上调前的租金（用于上限计算）。",
    bj:"建造年份（可入住）。决定能源标准。",
    pers:"家庭人数 - 决定热水需求（每人每年约800 kWh）。",
    garage:"车库或停车位价格，与居住区分开。交易费用按总价计算。",
    mieteQm:"每平方米居住面积的冷租金。乘以面积即为月冷租金。",
    ogdecke:"顶层天花板隔热 - 完整屋顶翻新的经济替代方案。",
    batterie:"电池储能容量（kWh）。经验法则：容量 ≈ PV 功率（kWp）。",
    sondertilg:"年度特别还款 - 通常贷款的5%/年。必须合同约定（德国民法典第500条）。",
    epStrom:"每千瓦时当前电价。德国平均约 0.35 €/kWh（2025）。与热泵、光伏、电动车相关。",
    epHeiz:"天然气、燃油、颗粒、区域供热的每千瓦时供暖成本。天然气约 0.12 €、燃油约 0.10 €、颗粒约 0.07 €、区域供热约 0.12 €。",
    fasFl:"估计的外墙面积。取决于附属情况。",
    daFl:"双坡顶：约地面面积 × 1.4，平顶：≈ 地面面积。",
    keFl:"地下室天花板面积。对于无供暖的地下室建议。",
    pvLeistung:"1 kWp ≈ 7 m² 屋顶面积。年产量约 950 kWh/kWp。"
  },
  hi:{
    kaufpreis:"क्लोजिंग लागत को छोड़कर सहमत खरीद मूल्य।",
    flaeche:"जर्मन WoFlV विनियमन के अनुसार शुद्ध रहने का क्षेत्र।",
    kaltmiete:"उपयोगिताओं को छोड़कर शुद्ध ठंडा किराया।",
    nichtUml:"किरायेदारों पर शुल्क नहीं किए जा सकने वाले खर्च: प्रबंधन, रखरखाव, आरक्षित।",
    leerstand:"विश्लेषण अवधि में अपेक्षित खाली महीने। यथार्थवादी: 10 वर्षों में 2-4 महीने।",
    eigenkapital:"खरीद के लिए तरल धन। नियम: कम से कम क्लोजिंग लागत + खरीद मूल्य का 20%।",
    zinssatz:`प्रति वर्ष नाममात्र दर (प्रभावी दर नहीं)। वर्तमान बाजार औसत: ${MARKET_RATES.avg}% (${MARKET_RATES.stand} तक)। स्रोत: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank।`,
    tilgung:"वार्षिक प्रारंभिक चुकौती दर। सिफारिश: उचित अवधि के लिए कम से कम 2-3%।",
    grEst:"रियल एस्टेट हस्तांतरण कर (GrEStG) - जर्मन राज्य के अनुसार 3.5%-6.5%।",
    notar:"नोटरी और भूमि रजिस्ट्री लागत, खरीद मूल्य का लगभग 1.5-2%।",
    makler:"रियल एस्टेट एजेंट कमीशन - 12/2020 से खरीदार और विक्रेता के बीच साझा (अधिकतम 3.57%)।",
    steuersatz:"एकजुटता अधिभार सहित व्यक्तिगत सीमांत कर दर (आमतौर पर 25-42%)।",
    afa:"जर्मन आयकर अधिनियम § 7 के अनुसार मूल्यह्रास। 1925 से रैखिक 2%, 2023 से नई इमारतों के लिए 3%।",
    grundAnteil:"मूल्यह्रास नहीं। शहरों में आमतौर पर 20%, ग्रामीण 10-15%।",
    gebAnteil:"भवन मूल्य - AfA दर के अनुसार मूल्यह्रास।",
    wertP:"दीर्घकालिक ऐतिहासिक मूल्य वृद्धि प्रति वर्ष 2-3%। मजबूत क्षेत्रीय भिन्नता।",
    sonder:"एकमुश्त HOA विशेष लेवी, जैसे नई हीटिंग, छत, मुखौटा नवीनीकरण, लिफ्ट। खरीदने से पहले HOA बैठक की कार्यवाही की समीक्षा करें।",
    renovierung:"खरीद पर अनुमानित नवीनीकरण लागत। 15% सीमा पार होने पर पूंजीकरण आवश्यक।",
    vgl:"प्रति m² स्थानीय तुलनात्मक किराया (किराया सूचकांक, डेटाबेस या मूल्यांकनकर्ता)।",
    lDat:"अंतिम अनुबंध-प्रभावी किराया वृद्धि की तारीख। § 558 BGB के अनुसार 15 महीने प्रतीक्षा।",
    lMiet:"अंतिम वृद्धि से पहले किराया (कैप गणना के लिए)।",
    bj:"निर्माण का वर्ष (कब्जे के लिए तैयार)। ऊर्जा मानक निर्धारित करता है।",
    pers:"घर में व्यक्ति - गर्म पानी की मांग निर्धारित करता है (~800 kWh/व्यक्ति/वर्ष)।",
    garage:"गैरेज या पार्किंग स्थान का मूल्य, रहने के क्षेत्र से अलग। क्लोजिंग लागत कुल मूल्य पर गणना की जाती है।",
    mieteQm:"प्रति m² रहने के क्षेत्र का ठंडा किराया। क्षेत्र से गुणा मासिक ठंडा किराया देता है।",
    ogdecke:"शीर्ष मंजिल छत इन्सुलेशन - पूर्ण छत नवीनीकरण के लिए लागत प्रभावी विकल्प।",
    batterie:"kWh में बैटरी भंडारण क्षमता। नियम: क्षमता ≈ kWp में PV शक्ति।",
    sondertilg:"वार्षिक विशेष चुकौती - आमतौर पर ऋण का 5%/वर्ष। अनुबंध में सहमत होना चाहिए (§ 500 BGB)।",
    epStrom:"प्रति kWh वर्तमान बिजली मूल्य। जर्मन औसत लगभग 0.35 €/kWh (2025)। हीट पंप, PV, EV के लिए प्रासंगिक।",
    epHeiz:"गैस, तेल, पैलेट, ज़िला हीटिंग के लिए प्रति kWh हीटिंग लागत। गैस ~0.12 €, तेल ~0.10 €, पैलेट ~0.07 €, ज़िला हीटिंग ~0.12 €।",
    fasFl:"अनुमानित मुखौटा क्षेत्र। संलग्नक स्थिति पर निर्भर।",
    daFl:"ढलान छत: ~जमीन क्षेत्र × 1.4, समतल छत: ≈ जमीन क्षेत्र।",
    keFl:"तहखाने की छत का क्षेत्र। बिना गर्म तहखाने के लिए अनुशंसित।",
    pvLeistung:"1 kWp ≈ 7 m² छत क्षेत्र। वार्षिक उत्पादन ~950 kWh/kWp।"
  }
};


const LEG={
  rendite:[
    {law:"§ 21 EStG",desc:"Einkünfte aus Vermietung und Verpachtung - steuerliche Behandlung der Mieteinnahmen."},
    {law:"§ 7 Abs. 4 EStG",desc:"AfA - Absetzung für Abnutzung: 2% p.a. linear (Baujahr ≥1925), 3% bei Neubau seit 2023."},
    {law:"§ 9 EStG",desc:"Werbungskosten: Zinsen, Verwaltung, Instandhaltung, Fahrtkosten etc. absetzbar."},
    {law:"GrEStG",desc:"Grunderwerbsteuergesetz - Steuersätze variieren zwischen Bundesländern (3,5%-6,5%)."},
    {law:"§ 558 BGB",desc:"Kappungsgrenze: Mieterhöhung max. 20% in 3 J., 15% bei angespanntem Wohnungsmarkt."},
    {law:"§§ 556d-g BGB",desc:"Mietpreisbremse bei Neuvermietung in Gebieten mit angespanntem Wohnungsmarkt."}
  ],
  kredit:[
    {law:"§§ 488-498 BGB",desc:"Darlehensvertrag - Rechte und Pflichten zwischen Darlehensnehmer und Bank."},
    {law:"§ 489 BGB",desc:"Sonderkündigungsrecht: Nach 10 Jahren Zinsbindung kostenlose Ablösung mit 6 Monaten Frist."},
    {law:"§ 500 Abs. 2 BGB",desc:"Vorzeitige Rückzahlung - Sondertilgungen nach vertraglicher Vereinbarung."},
    {law:"§ 502 BGB",desc:"Vorfälligkeitsentschädigung bei vorzeitiger Ablösung innerhalb der Zinsbindung."},
    {law:"PAngV",desc:"Preisangabenverordnung - Banken müssen den effektiven Jahreszins ausweisen."}
  ],
  miete:[
    {law:"§ 558 BGB",desc:"Mieterhöhung bis zur ortsüblichen Vergleichsmiete - Kappungsgrenze 20% (15% angespannt)."},
    {law:"§ 558 Abs. 1 S. 2 BGB",desc:"15-Monats-Sperrfrist: Nächste Erhöhung frühestens 15 Monate nach letzter."},
    {law:"§ 558a BGB",desc:"Formale Anforderungen: Mieterhöhung schriftlich, Begründung (Mietspiegel o.ä.)."},
    {law:"§ 558b BGB",desc:"Mieter hat 2 Monate Zustimmungsfrist - bei Ablehnung Klage möglich."},
    {law:"§ 559 BGB",desc:"Modernisierungsumlage: 8% der Kosten auf Jahresmiete umlegbar."},
    {law:"§§ 556d-g BGB",desc:"Mietpreisbremse - max. 10% über Vergleichsmiete bei Neuvermietung."}
  ],
  sanier:[
    {law:"GEG (Gebäudeenergiegesetz 2024)",desc:"Energetische Mindestanforderungen und Nachrüstpflichten für Gebäude."},
    {law:"§ 71 GEG",desc:"Ab 2024: Neue Heizungen müssen 65% erneuerbare Energien nutzen (mit Übergangsfristen)."},
    {law:"§ 72 GEG",desc:"Austauschpflicht: Heizungen älter als 30 Jahre müssen ersetzt werden (mit Ausnahmen)."},
    {law:"§ 47 GEG",desc:"Nachrüstpflichten nach Eigentümerwechsel: Oberste Geschossdecke, Heizungsrohre."},
    {law:"BEG (Bundesförderung effiziente Gebäude)",desc:"KfW 261 (Wohngebäude-Kredit) und BAFA BEG EM (Einzelmaßnahmen-Zuschuss)."},
    {law:"§ 35c EStG",desc:"Steuerbonus: 20% der Kosten über 3 Jahre bei selbstgenutzten Immobilien (max. 40.000€)."},
    {law:"iSFP (individueller Sanierungsfahrplan)",desc:"Förderbonus +5% bei BAFA-Maßnahmen mit zertifiziertem Energieberater."}
  ]
};

function Tip({text}){
  const[s,setS]=useState(false);const ref=useRef();const[pos,setPos]=useState("center");
  useEffect(()=>{if(s&&ref.current){const r=ref.current.getBoundingClientRect();if(r.left<120)setPos("left");else if(r.right>window.innerWidth-120)setPos("right");else setPos("center")}},[s]);
  const st=pos==="left"?{left:0}:pos==="right"?{right:0}:{left:"50%",transform:"translateX(-50%)"};
  return <span ref={ref} style={{position:"relative",display:"inline-block",marginLeft:4}}>
    <span onClick={e=>{e.stopPropagation();setS(!s)}} onMouseEnter={()=>setS(true)} onMouseLeave={()=>setS(false)}
      style={{cursor:"help",display:"inline-flex",alignItems:"center",justifyContent:"center",width:13,height:13,borderRadius:"50%",border:"1px solid var(--ch)",color:"var(--ch)",fontSize:9,fontWeight:600,background:"var(--cc)"}}>?</span>
    {s&&<div style={{position:"absolute",bottom:"calc(100% + 6px)",...st,width:220,padding:"8px 10px",background:"#1a1a1a",color:"#fff",fontSize:11,lineHeight:1.4,borderRadius:6,zIndex:100,pointerEvents:"none",whiteSpace:"normal",fontWeight:400}}>{text}</div>}
  </span>;
}

// Custom language selector — shows emoji flags reliably across all browsers
const LANGS=[{v:"de",flag:"🇩🇪",label:"DE"},{v:"en",flag:"🇬🇧",label:"EN"},{v:"tr",flag:"🇹🇷",label:"TR"},{v:"zh",flag:"🇨🇳",label:"ZH"},{v:"hi",flag:"🇮🇳",label:"HI"}];
function LangSel({lang,setLang}){
  const[open,setOpen]=useState(false);
  const ref=useRef();
  const cur=LANGS.find(l=>l.v===lang)||LANGS[0];
  useEffect(()=>{
    if(!open)return;
    const handler=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false)};
    document.addEventListener("mousedown",handler);
    return ()=>document.removeEventListener("mousedown",handler);
  },[open]);
  return <div ref={ref} style={{position:"relative",userSelect:"none"}}>
    <button onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 11px",border:"1px solid var(--cb)",borderRadius:8,background:"var(--ci)",cursor:"pointer",fontFamily:"inherit",fontSize:15,fontWeight:600,color:"var(--ct)",minHeight:38}}>
      <span style={{fontSize:20,lineHeight:1}}>{cur.flag}</span>
      <span style={{fontSize:12,color:"var(--ch)"}}>{cur.label}</span>
      <span style={{fontSize:9,color:"var(--ch)",marginLeft:1}}>{open?"▲":"▼"}</span>
    </button>
    {open&&<div style={{position:"absolute",top:"calc(100% + 4px)",right:0,background:"var(--cc)",border:"1px solid var(--cb)",borderRadius:10,boxShadow:"0 8px 24px rgba(0,0,0,.1)",zIndex:200,overflow:"hidden",minWidth:90}}>
      {LANGS.map(l=><button key={l.v} onClick={()=>{setLang(l.v);setOpen(false)}} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",width:"100%",border:"none",borderBottom:"1px solid var(--cb)",background:l.v===lang?"var(--ca-bg)":"var(--cc)",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:l.v===lang?700:500,color:l.v===lang?"var(--ca)":"var(--ct)",textAlign:"left"}}>
        <span style={{fontSize:18,lineHeight:1}}>{l.flag}</span>
        <span>{l.label}</span>
      </button>)}
    </div>}
  </div>;
}

function Legal({items}){const{t}=useApp();
  const[o,setO]=useState(false);
  return <div style={{marginTop:16,borderTop:"1px solid var(--cb)",paddingTop:12}}>
    <button onClick={()=>setO(!o)} style={{background:"none",border:"none",fontSize:11,color:"var(--ch)",cursor:"pointer",padding:0,fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
      <span>📚 {t.rechtlGrundlagen}</span><span>{o?"▲":"▼"}</span>
    </button>
    {o&&<div style={{marginTop:10,fontSize:11,color:"var(--ch)",lineHeight:1.7}}>
      {items.map((it,i)=><div key={i} style={{marginBottom:6,padding:"8px 10px",background:"var(--ci)",borderRadius:6}}><div style={{fontWeight:600,color:"var(--cl)",marginBottom:2}}>{it.law}</div><div>{it.desc}</div></div>)}
      <div style={{marginTop:10,fontSize:10,fontStyle:"italic"}}>{t.rechtsHinweis}</div>
    </div>}
  </div>;
}

function LineChart({rows,zbJ}){
  const{t}=useApp();
  const[hover,setHover]=useState(null);
  const[hoverCF,setHoverCF]=useState(null);
  const W=400,H=250,pl=44,pr=44,pt=20,pb=20;
  const pw=W-pl-pr,ph=H-pt-pb,n=rows.length;
  if(n<2)return null;

  // Main chart: Restschuld + kum. Cashflow + Jahresmiete
  const rA=rows.map(r=>r.rest),cA=rows.map(r=>r.cfKum),mA=rows.map(r=>r.miete);
  const mxR=Math.max(...rA,...mA,1);  // left axis includes both Restschuld and Jahresmiete
  const all=[...cA,0];
  const mnS=Math.min(...all),mxS=Math.max(...all),rS=mxS-mnS||1;
  const xS=i=>pl+(i/(n-1))*pw;
  const yL=v=>pt+ph*(1-v/mxR);
  const yR=v=>pt+ph*(1-(v-mnS)/rS);
  const pL=arr=>arr.map((v,i)=>(i?"L":"M")+xS(i)+" "+yL(v)).join(" ");
  const pR=arr=>arr.map((v,i)=>(i?"L":"M")+xS(i)+" "+yR(v)).join(" ");
  const fK=v=>Math.round(v/1000)+"k";
  const step=Math.max(1,Math.floor(n/10));
  const zbIdx=zbJ&&zbJ<=n?zbJ-1:null;

  // CF chart: monatlicher CF ohne/mit Steuer
  const cfOhneArr=rows.map(r=>(r.cfOhneSt??r.cf-r.steuer)/12);
  const cfMitArr=rows.map(r=>r.cf/12);
  const allCF=[...cfOhneArr,...cfMitArr,0];
  const mnCF=Math.min(...allCF),mxCF=Math.max(...allCF),rCF=mxCF-mnCF||1;
  const yCF=v=>pt+ph*(1-(v-mnCF)/rCF);
  const pCF=arr=>arr.map((v,i)=>(i?"L":"M")+xS(i)+" "+yCF(v)).join(" ");
  const zero0=mnCF<=0&&mxCF>=0?yCF(0):null;

  return <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"1px solid var(--cb)",marginBottom:12}}>

    {/* ── Chart 1: Restschuld / kum. CF / Miete ── */}
    <div style={{fontSize:12,fontWeight:700,color:"var(--ct)",marginBottom:8}}>{t.chartTitle1}</div>
    <div style={{display:"flex",gap:14,fontSize:10,marginBottom:6,color:"var(--ch)",flexWrap:"wrap"}}>
      <span><span style={{display:"inline-block",width:14,height:0,borderTop:"2px solid #c0392b",verticalAlign:"middle",marginRight:4}}/>{t.chartRestschuld}</span>
      <span><span style={{display:"inline-block",width:14,height:0,borderTop:"2px solid #22c55e",verticalAlign:"middle",marginRight:4}}/>{t.chartKumCF}</span>
      <span><span style={{display:"inline-block",width:14,height:0,borderTop:"2px dashed #e8600a",verticalAlign:"middle",marginRight:4}}/>{t.chartJahresmiete}</span>
      {zbIdx!==null&&<span><span style={{display:"inline-block",width:14,height:0,borderTop:"2px dashed #f59e0b",verticalAlign:"middle",marginRight:4}}/>{t.chartZinsbind}</span>}
    </div>
    <div style={{position:"relative",overflowX:"auto"}}>
      <svg width="100%" viewBox={"0 0 "+W+" "+H} style={{fontSize:10,fontFamily:"inherit"}}>
        {[0,.25,.5,.75,1].map((f,i)=><line key={i} x1={pl} x2={W-pr} y1={pt+ph*f} y2={pt+ph*f} stroke="var(--cb)" strokeWidth="0.5"/>)}
        {zbIdx!==null&&<line x1={xS(zbIdx)} x2={xS(zbIdx)} y1={pt} y2={pt+ph} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 3"/>}
        {zbIdx!==null&&<text x={xS(zbIdx)} y={pt-6} textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="600">ZB</text>}
        <path d={pL(rA)} stroke="#c0392b" strokeWidth="1.8" fill="none"/>
        <path d={pR(cA)} stroke="#22c55e" strokeWidth="1.8" fill="none"/>
        <path d={pR(mA)} stroke="#e8600a" strokeWidth="1.8" strokeDasharray="4 3" fill="none"/>
        {rA.map((v,i)=><circle key={"r"+i} cx={xS(i)} cy={yL(v)} r={hover===i?4:2} fill="#c0392b" style={{transition:"r .15s"}}/>)}
        {cA.map((v,i)=><circle key={"c"+i} cx={xS(i)} cy={yR(v)} r={hover===i?4:2} fill="#22c55e" style={{transition:"r .15s"}}/>)}
        {rows.map((r,i)=>((i%step===0)||i===n-1)&&<text key={"x"+i} x={xS(i)} y={H-pb+14} textAnchor="middle" fill="var(--ch)">J{i+1}</text>)}
        {[0,.5,1].map((f,i)=><text key={"yl"+i} x={pl-4} y={pt+ph*f+3} textAnchor="end" fill="#c0392b" fontSize="8">{fK(mxR*(1-f))}</text>)}
        {[0,.5,1].map((f,i)=><text key={"yr"+i} x={W-pr+4} y={pt+ph*f+3} fill="#22c55e" fontSize="8">{fK(mnS+rS*(1-f))}</text>)}
        {hover!==null&&<line x1={xS(hover)} x2={xS(hover)} y1={pt} y2={pt+ph} stroke="var(--ch)" strokeWidth="0.5" strokeDasharray="2 2"/>}
        {rows.map((r,i)=><rect key={"h"+i} x={xS(i)-(i===0?0:pw/(n-1)/2)} y={pt} width={i===0||i===n-1?pw/(n-1)/2:pw/(n-1)} height={ph} fill="transparent" onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)} style={{cursor:"crosshair"}}/>)}
      </svg>
      {hover!==null&&rows[hover]&&<div style={{position:"absolute",top:0,left:xS(hover)>W/2?"auto":"calc("+xS(hover)*100/W+"% + 8px)",right:xS(hover)>W/2?"calc("+(100-xS(hover)*100/W)+"% + 8px)":"auto",background:"#1a1a1a",color:"#fff",borderRadius:8,padding:"8px 10px",fontSize:10,lineHeight:1.6,zIndex:10,pointerEvents:"none",minWidth:150,boxShadow:"0 4px 12px rgba(0,0,0,.25)"}}>
        <div style={{fontWeight:600,marginBottom:4,borderBottom:"1px solid #444",paddingBottom:3}}>J{rows[hover].j}{zbIdx!==null&&rows[hover].j===zbJ?" ◀ ZB":""}</div>
        <div style={{color:"#ef8888"}}>{t.chartRestschuld}: {fmtE(rows[hover].rest)}</div>
        <div style={{color:"#ef8888"}}>{t.gZin}: {fmtE(rows[hover].zinsen)}</div>
        <div style={{color:"#6ddb8a"}}>{t.steuerErs}: {fmtE(rows[hover].steuer)}</div>
        <div style={{color:"#6dabf5"}}>{t.chartHoverJahresmiete}: {fmtE(rows[hover].miete)}</div>
        <div style={{color:(rows[hover].cfOhneSt??0)>=0?"#ffa64d":"#ef8888",marginTop:2}}>{t.chartHoverCFOhne}: {fmtE(rows[hover].cfOhneSt??0)}</div>
        <div style={{color:rows[hover].cf>=0?"#6ddb8a":"#ef8888"}}>{t.chartHoverCFMit}: {fmtE(rows[hover].cf)}</div>
        <div style={{color:rows[hover].cfKum>=0?"#6ddb8a":"#ef8888",borderTop:"1px solid #444",paddingTop:3,marginTop:3}}>{t.chartHoverKumCF}: {fmtE(rows[hover].cfKum)}</div>
      </div>}
    </div>

    {/* ── Chart 2: Monatlicher Cashflow-Verlauf (ohne / mit Steuer) ── */}
    <div style={{marginTop:18,paddingTop:14,borderTop:"1px solid var(--cb)"}}>
      <div style={{fontSize:12,fontWeight:700,color:"var(--ct)",marginBottom:8}}>{t.chartTitle2}</div>
      <div style={{display:"flex",gap:14,fontSize:10,marginBottom:6,color:"var(--ch)",flexWrap:"wrap"}}>
        <span><span style={{display:"inline-block",width:14,height:0,borderTop:"2.5px solid #e8600a",verticalAlign:"middle",marginRight:4}}/>{t.chartCFOhne}</span>
        <span><span style={{display:"inline-block",width:14,height:0,borderTop:"2.5px solid #22c55e",verticalAlign:"middle",marginRight:4}}/>{t.chartCFMit}</span>
        <span style={{color:"var(--ch)",fontStyle:"italic"}}>{t.chartDiff}</span>
        {zbIdx!==null&&<span><span style={{display:"inline-block",width:14,height:0,borderTop:"2px dashed #f59e0b",verticalAlign:"middle",marginRight:4}}/>{t.chartZinsbind}</span>}
      </div>
      <div style={{position:"relative",overflowX:"auto"}}>
        <svg width="100%" viewBox={"0 0 "+W+" "+H} style={{fontSize:10,fontFamily:"inherit"}}>
          {/* Grid lines */}
          {[0,.25,.5,.75,1].map((f,i)=><line key={i} x1={pl} x2={W-pr} y1={pt+ph*f} y2={pt+ph*f} stroke="var(--cb)" strokeWidth="0.5"/>)}
          {/* Zero line */}
          {zero0!==null&&<line x1={pl} x2={W-pr} y1={zero0} y2={zero0} stroke="var(--ch)" strokeWidth="1" strokeDasharray="3 2"/>}
          {zero0!==null&&<text x={pl-4} y={zero0+3} textAnchor="end" fill="var(--ch)" fontSize="8" fontWeight="600">0</text>}
          {/* Zinsbindung */}
          {zbIdx!==null&&<line x1={xS(zbIdx)} x2={xS(zbIdx)} y1={pt} y2={pt+ph} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="5 3"/>}
          {zbIdx!==null&&<text x={xS(zbIdx)} y={pt-6} textAnchor="middle" fill="#f59e0b" fontSize="8" fontWeight="600">ZB</text>}
          {/* Area between lines (Steuervorteil) */}
          <defs>
            <linearGradient id="cfGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.15"/>
              <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02"/>
            </linearGradient>
          </defs>
          <path d={pCF(cfOhneArr)+"L"+xS(n-1)+" "+(pt+ph)+" L"+pl+" "+(pt+ph)+" Z"} fill="url(#cfGrad)" strokeWidth="0"/>
          {/* Lines */}
          <path d={pCF(cfOhneArr)} stroke="#e8600a" strokeWidth="2" fill="none"/>
          <path d={pCF(cfMitArr)} stroke="#22c55e" strokeWidth="2" fill="none"/>
          {/* Dots */}
          {cfOhneArr.map((v,i)=><circle key={"co"+i} cx={xS(i)} cy={yCF(v)} r={hoverCF===i?4:2} fill="#e8600a" style={{transition:"r .15s"}}/>)}
          {cfMitArr.map((v,i)=><circle key={"cm"+i} cx={xS(i)} cy={yCF(v)} r={hoverCF===i?4:2} fill="#22c55e" style={{transition:"r .15s"}}/>)}
          {/* X axis labels */}
          {rows.map((r,i)=>((i%step===0)||i===n-1)&&<text key={"cx"+i} x={xS(i)} y={H-pb+14} textAnchor="middle" fill="var(--ch)">J{i+1}</text>)}
          {/* Y labels */}
          {[0,.5,1].map((f,i)=><text key={"cy"+i} x={pl-4} y={pt+ph*f+3} textAnchor="end" fill="var(--ch)" fontSize="8">{fmtE(mnCF+rCF*(1-f))}</text>)}
          {hoverCF!==null&&<line x1={xS(hoverCF)} x2={xS(hoverCF)} y1={pt} y2={pt+ph} stroke="var(--ch)" strokeWidth="0.5" strokeDasharray="2 2"/>}
          {/* Hover area */}
          {rows.map((r,i)=><rect key={"hcf"+i} x={xS(i)-(i===0?0:pw/(n-1)/2)} y={pt} width={i===0||i===n-1?pw/(n-1)/2:pw/(n-1)} height={ph} fill="transparent" onMouseEnter={()=>setHoverCF(i)} onMouseLeave={()=>setHoverCF(null)} style={{cursor:"crosshair"}}/>)}
        </svg>
        {hoverCF!==null&&rows[hoverCF]&&<div style={{position:"absolute",top:0,left:xS(hoverCF)>W/2?"auto":"calc("+xS(hoverCF)*100/W+"% + 8px)",right:xS(hoverCF)>W/2?"calc("+(100-xS(hoverCF)*100/W)+"% + 8px)":"auto",background:"#1a1a1a",color:"#fff",borderRadius:8,padding:"8px 10px",fontSize:10,lineHeight:1.6,zIndex:10,pointerEvents:"none",minWidth:160,boxShadow:"0 4px 12px rgba(0,0,0,.25)"}}>
          <div style={{fontWeight:600,marginBottom:4,borderBottom:"1px solid #444",paddingBottom:3}}>J{rows[hoverCF].j}</div>
          <div style={{color:"#ffa64d"}}>{t.cfOhneSt}: {fmtE(cfOhneArr[hoverCF])}</div>
          <div style={{color:"#6ddb8a"}}>{t.cfMitSt}: {fmtE(cfMitArr[hoverCF])}</div>
          <div style={{color:"#aaa",marginTop:2}}>{t.chartHoverSteuervorteil}: {fmtE(cfMitArr[hoverCF]-cfOhneArr[hoverCF])}</div>
        </div>}
      </div>
      <div style={{fontSize:10,color:"var(--ch)",marginTop:6,fontStyle:"italic"}}>{t.chartDisclamer}</div>
    </div>
  </div>;
}

function YearTable({rows,zbJ}){
  const{t}=useApp();
  const sum=rows.reduce((s,r)=>({zinsen:s.zinsen+r.zinsen,tilgB:s.tilgB+r.tilgB,zt:s.zt+r.zt,steuer:s.steuer+r.steuer,miete:s.miete+r.miete,cf:s.cf+r.cf,cfOhneSt:s.cfOhneSt+(r.cfOhneSt??r.cf-r.steuer)}),{zinsen:0,tilgB:0,zt:0,steuer:0,miete:0,cf:0,cfOhneSt:0});
  const stickyJ={padding:"4px 8px",textAlign:"left",fontWeight:600,position:"sticky",left:0,background:"var(--ci)",zIndex:2,whiteSpace:"nowrap",borderRight:"1px solid var(--cb)"};
  const stickyH={padding:"4px 8px",textAlign:"left",fontWeight:500,color:"var(--ch)",position:"sticky",left:0,background:"var(--ci)",zIndex:3,borderRight:"1px solid var(--cb)"};
  const td={padding:"4px 8px",textAlign:"right",whiteSpace:"nowrap"};
  return <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"1px solid var(--cb)",marginBottom:12}}>
    <div style={{fontSize:12,fontWeight:700,color:"var(--ct)",marginBottom:4}}>{t.tblTitle} ({rows.length} J.)</div>
    <div style={{fontSize:10,color:"var(--ch)",marginBottom:8,lineHeight:1.5}}>
      {t.tblCFOhne} = {t.cfBasis} &nbsp;|&nbsp; {t.tblCFMit} = + {t.steuerErs} (AfA × {t.steuersatz})
    </div>
    {/* Mobile scroll hint */}
    <div style={{fontSize:9,color:"var(--ch)",marginBottom:6,display:"flex",alignItems:"center",gap:4}}>
      <span style={{opacity:.6}}>↔ scrollbar</span>
    </div>
    <div style={{overflowX:"auto",borderRadius:8,border:"1px solid var(--cb)"}}>
      <table style={{fontSize:10,borderCollapse:"collapse",minWidth:580,width:"100%"}}>
        <thead>
          <tr style={{background:"var(--ci)",borderBottom:"2px solid var(--cb)"}}>
            <th style={stickyH}>{t.jahre}</th>
            <th style={{...td,textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{t.chartRestschuld}</th>
            <th style={{...td,textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{t.gZin}</th>
            <th style={{...td,textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{t.tilgung}</th>
            <th style={{...td,textAlign:"right",fontWeight:500,color:"#22c55e"}}>{t.steuerErs}</th>
            <th style={{...td,textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{t.tblJahresmiete}</th>
            <th style={{...td,textAlign:"right",fontWeight:700,color:"var(--ca)"}}>{t.tblCFOhne}</th>
            <th style={{...td,textAlign:"right",fontWeight:700,color:"#22c55e"}}>{t.tblCFMit}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>{
            const cfO=r.cfOhneSt??r.cf-r.steuer;
            const isZB=zbJ&&r.j===zbJ;
            return <tr key={r.j} style={{borderBottom:"1px solid var(--cb)",background:isZB?"#FFF8E6":"transparent"}}>
              <td style={{...stickyJ,background:isZB?"#FFF8E6":"var(--ci)"}}>
                {r.j}{isZB&&<span style={{fontSize:8,color:"#b8860b",marginLeft:4}}>◀ ZB</span>}
              </td>
              <td style={{...td,color:"var(--ct)"}}>{fmtE(r.rest)}</td>
              <td style={{...td,color:"var(--ct)"}}>{fmtE(r.zinsen)}</td>
              <td style={{...td,color:"var(--ct)"}}>{fmtE(r.tilgB)}</td>
              <td style={{...td,color:"var(--ct)"}}>{fmtE(r.steuer)}</td>
              <td style={{...td,color:"var(--ct)"}}>{fmtE(r.miete)}</td>
              <td style={{...td,fontWeight:600,color:cfO>=0?"#22c55e":"#ef4444"}}>{fmtE(cfO)}</td>
              <td style={{...td,fontWeight:600,color:r.cf>=0?"#22c55e":"#ef4444"}}>{fmtE(r.cf)}</td>
            </tr>;
          })}
          {zbJ&&zbJ<=rows.length&&<tr style={{fontSize:9,background:"#FFF8E6"}}>
            <td colSpan={8} style={{padding:"4px 8px",color:"#b8860b"}}>{t.zinsbindung} {zbJ} J. — {t.chartRestschuld} {fmtE(rows[zbJ-1]?.rest||0)}</td>
          </tr>}
          <tr style={{fontWeight:700,borderTop:"2px solid var(--ct)",background:"var(--ci)"}}>
            <td style={{...stickyJ,fontWeight:700}}>{t.tblSumme}</td>
            <td style={{...td,color:"var(--ch)"}}>—</td>
            <td style={{...td,color:"var(--ct)"}}>{fmtE(sum.zinsen)}</td>
            <td style={{...td,color:"var(--ct)"}}>{fmtE(sum.tilgB)}</td>
            <td style={{...td,color:"var(--ct)"}}>{fmtE(sum.steuer)}</td>
            <td style={{...td,color:"var(--ct)"}}>{fmtE(sum.miete)}</td>
            <td style={{...td,fontWeight:700,color:sum.cfOhneSt>=0?"#22c55e":"#ef4444"}}>{fmtE(sum.cfOhneSt)}</td>
            <td style={{...td,fontWeight:700,color:sum.cf>=0?"#22c55e":"#ef4444"}}>{fmtE(sum.cf)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>;
}

function Detail({R,d}){
  const{t}=useApp();
  const ek=+d.eigenkapital||0,sonder=+d.sonder||0,ren=+d.renovierung||0;
  const vw=R.vw;
  const rsEnd=R.rsEnd||0;
  const sumN=ek+(R.nbk||0)+sonder+ren+rsEnd;

  // Erträge — beide CF-Varianten
  const erloesVerkauf=vw;
  const sumPOhne=erloesVerkauf+(R.sCFOhne||0);
  const sumPMit=erloesVerkauf+R.sCF;
  const totalOhne=(R.gOhne!=null?R.gOhne:sumPOhne-sumN);
  const totalMit=R.g;
  const rendEKOhne=ek>0?totalOhne/ek*100:0;
  const rendEKMit=ek>0?totalMit/ek*100:0;
  const isPosOhne=totalOhne>=0;
  const isPosMit=totalMit>=0;

  const rowStyle={padding:"5px 0",fontSize:11,borderBottom:"1px solid var(--cb)"};
  const rowFlex={display:"flex",justifyContent:"space-between",alignItems:"baseline"};

  return <div style={{marginBottom:12}}>
    <div style={{fontSize:12,fontWeight:700,color:"var(--ct)",marginBottom:4}}>{t.detTitle} {R.j} {t.detJahren}</div>
    <div style={{fontSize:10,color:"var(--ch)",marginBottom:12}}>{t.detSub}</div>

    {/* Erträge + Aufwendungen nebeneinander */}
    <div className="if-row" style={{marginBottom:12}}>

      {/* ERTRÄGE */}
      <div style={{background:"var(--cc)",border:"1px solid var(--cb)",borderTop:"3px solid #22c55e",borderRadius:10,padding:"12px"}}>
        <div style={{fontSize:10,color:"#22c55e",fontWeight:700,marginBottom:8,letterSpacing:.8}}>{t.ertraege}</div>
        <div style={rowStyle}>
          <div style={rowFlex}><span style={{color:"var(--cl)"}}>{t.detErloes}</span><span style={{color:"#22c55e",fontWeight:600}}>{fmtE(erloesVerkauf)}</span></div>
          <div style={{fontSize:9,color:"var(--ch)",marginTop:2}}>{t.kaufpreis} {fmtE(R.gKP||+d.kaufpreis||0)} + {fmtP(+d.wertP||0,1)} p.a. {t.wertP}</div>
        </div>
        <div style={rowStyle}>
          <div style={rowFlex}><span style={{color:"var(--cl)"}}>{t.detCumCFOhne}</span><span style={{color:"var(--ca)",fontWeight:600}}>{fmtE(R.sCFOhne||0)}</span></div>
        </div>
        <div style={{...rowStyle,borderBottom:"none"}}>
          <div style={rowFlex}><span style={{color:"var(--cl)"}}>{t.detCumSteuer}</span><span style={{color:"#22c55e",fontWeight:600}}>{fmtE(R.sSt||0)}</span></div>
          <div style={{fontSize:9,color:"var(--ch)",marginTop:2}}>{t.detSteuerHinweis}</div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 0",marginTop:4,borderTop:"1px solid var(--cb)"}}>
          <div>
            <div style={{fontSize:10,fontWeight:500,color:"var(--ch)"}}>{t.detSumme} {t.saldoOhne}</div>
            <div style={{fontSize:14,fontWeight:700,color:"var(--ca)"}}>{fmtE(sumPOhne)}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:10,fontWeight:500,color:"var(--ch)"}}>{t.detSumme} {t.saldoMit}</div>
            <div style={{fontSize:14,fontWeight:700,color:"#22c55e"}}>{fmtE(sumPMit)}</div>
          </div>
        </div>
      </div>

      {/* AUFWENDUNGEN */}
      <div style={{background:"var(--cc)",border:"1px solid var(--cb)",borderTop:"3px solid #ef4444",borderRadius:10,padding:"12px"}}>
        <div style={{fontSize:10,color:"#ef4444",fontWeight:700,marginBottom:8,letterSpacing:.8}}>{t.aufwend}</div>
        {(()=>{const aufItems=[{l:t.eigenkapital,v:ek},{l:t.nbk,v:R.nbk},{l:t.sonderUml,v:sonder},...(ren>0?[{l:t.renovierung,v:ren}]:[]),{l:t.chartRestschuld,v:rsEnd}];return aufItems.map((i,k)=><div key={k} style={{...rowStyle,borderBottom:k===aufItems.length-1?"none":"1px solid var(--cb)"}}>
          <div style={rowFlex}><span style={{color:"var(--cl)"}}>{i.l}</span><span style={{color:"#ef4444",fontWeight:500}}>{fmtE(i.v)}</span></div>
        </div>);})()}
        <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0 0",marginTop:4,borderTop:"1px solid var(--cb)"}}>
          <span style={{fontSize:12,fontWeight:600}}>{t.detSumme}</span>
          <span style={{fontSize:14,fontWeight:700,color:"#ef4444"}}>{fmtE(sumN)}</span>
        </div>
      </div>
    </div>

    {/* GESAMTSALDO — zwei Varianten */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:8}}>
      {/* Ohne Steuervorteil */}
      <div style={{padding:"14px",background:isPosOhne?"#F0F7FF":"#FFF5F0",borderRadius:10,border:`1px solid ${isPosOhne?"#C3DBF5":"#F5D4B8"}`}}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:.8,color:isPosOhne?"#1a5fa0":"#8a4a10",marginBottom:6,textTransform:"uppercase"}}>{t.gSaldoOhne}</div>
        <div style={{fontSize:22,fontWeight:800,color:isPosOhne?"#1a5fa0":"#8a4a10",fontVariantNumeric:"tabular-nums"}}>{isPosOhne?"+":""}{fmtE(totalOhne)}</div>
        <div style={{fontSize:10,color:isPosOhne?"#1a5fa0":"#8a4a10",opacity:.8,marginTop:4}}>
          {t.detEKR}: {fmtP(rendEKOhne)} ({fmtP(rendEKOhne/R.j)} p.a.)
        </div>
        <div style={{fontSize:9,color:"var(--ch)",marginTop:6,lineHeight:1.4}}>
          {t.detInfo}
        </div>
      </div>

      {/* Mit Steuervorteil */}
      <div style={{padding:"14px",background:isPosMit?"#F0F7FF":"#FFF5F0",borderRadius:10,border:`1px solid ${isPosMit?"#C3DBF5":"#F5D4B8"}`}}>
        <div style={{fontSize:9,fontWeight:700,letterSpacing:.8,color:isPosMit?"#1a5fa0":"#8a4a10",marginBottom:6,textTransform:"uppercase"}}>{t.gSaldoMit}</div>
        <div style={{fontSize:22,fontWeight:800,color:isPosMit?"#1a5fa0":"#8a4a10",fontVariantNumeric:"tabular-nums"}}>{isPosMit?"+":""}{fmtE(totalMit)}</div>
        <div style={{fontSize:10,color:isPosMit?"#1a5fa0":"#8a4a10",opacity:.8,marginTop:4}}>
          {t.detEKR}: {fmtP(rendEKMit)} ({fmtP(rendEKMit/R.j)} p.a.)
        </div>
        <div style={{fontSize:9,color:"var(--ch)",marginTop:6,lineHeight:1.4}}>
          {t.detSteuerVoraus}
        </div>
      </div>
    </div>

    <div style={{fontSize:9,color:"var(--ch)",padding:"8px 10px",background:"var(--ci)",borderRadius:6,lineHeight:1.5}}>
      ℹ️ {t.detInfo}
    </div>
  </div>;
}


function ExportPDF({title}){const{t}=useApp();
  const doExport=()=>{
    const rp=document.querySelector(".res-pane");
    if(!rp)return;
    const clone=rp.cloneNode(true);
    clone.querySelectorAll("button,.no-print").forEach(e=>e.remove());
    const vars={"var(--cc)":"#fff","var(--ct)":"#1a1a1a","var(--cl)":"#3d3d3a","var(--ch)":"#8a8a80","var(--cb)":"#e5e5dc","var(--ci)":"#fafaf7","var(--cro)":"#f0f0ea","var(--ca)":"#e8600a","var(--ca-dk)":"#c44d00","var(--ca-bg)":"#fff1e8","var(--ca-bd)":"#f5cba9","var(--bg)":"#f5f5f0"};
    let h=clone.innerHTML;
    Object.entries(vars).forEach(([k,v])=>{h=h.split(k).join(v)});
    const now=new Date().toLocaleDateString("de-DE",{year:"numeric",month:"2-digit",day:"2-digit"});
    const doc=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Immofuchs - ${title}</title>
<style>@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:#fff;color:#1a1a1a;padding:30px;max-width:800px;margin:0 auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table{border-collapse:collapse;width:100%}svg{max-width:100%}
.hdr-print{text-align:center;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #e8600a}
@media print{body{padding:15px}}</style>
</head><body>
<div class="hdr-print"><div style="font-size:24px;font-weight:700;color:#e8600a">IMMOFUCHS</div><div style="font-size:14px;color:#8a8a80;margin-top:4px">${title} — ${now}</div></div>
${h}
<div style="margin-top:30px;padding-top:12px;border-top:1px solid #e5e5dc;font-size:9px;color:#8a8a80;text-align:center">Erstellt mit Immofuchs · ${now} · Keine Rechts- oder Steuerberatung</div>
<script>setTimeout(()=>window.print(),600)<\/script>
</body></html>`;
    const blob=new Blob([doc],{type:"text/html;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const w=window.open(url,"_blank");
    if(!w){const a=document.createElement("a");a.href=url;a.download="Immofuchs_"+title.replace(/\s+/g,"_")+".html";a.click()}
    setTimeout(()=>URL.revokeObjectURL(url),5000);
  };
  return <button className="no-print" onClick={doExport} style={{width:"100%",padding:"12px",border:"1px solid var(--cb)",borderRadius:10,background:"var(--ci)",color:"var(--ct)",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:12,marginBottom:4,fontFamily:"inherit"}}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    {t.pdfExport}
  </button>;
}

// ═══ HAUPTRECHNER (Rendite) ═══
function Haupt(){const{d,set,t,zinsen,tip}=useApp();const[view,setView]=useState("input");
  const vermietet=d.vermietet!=="nein";
  const immLeer=d.immLeer==="ja";
  const lastEditedRef=useRef(null);
  // mieteQm: use typed value; if empty string, don't fall back (allow clearing)
  const mieteQm=d.mieteQm!==""?+d.mieteQm||0:0;
  useEffect(()=>{
    if(lastEditedRef.current==="kalt")return;
    if(mieteQm>0&&(+d.flaeche||0)>0){
      const nM=Math.round(mieteQm*(+d.flaeche));
      if(nM!==(+d.kaltmiete||0))set("kaltmiete",String(nM));
    }
  },[mieteQm,d.flaeche]);
  useEffect(()=>{
    if(lastEditedRef.current!=="kalt")return;
    const fl=+d.flaeche||0,km=+d.kaltmiete||0;
    if(fl>0&&km>0){
      const newQm=Math.round((km/fl)*100)/100;
      if(String(newQm)!==d.mieteQm)set("mieteQm",String(newQm));
    }
    lastEditedRef.current=null;
  },[d.kaltmiete]);
  useEffect(()=>{if(immLeer){const dt=new Date();dt.setMonth(dt.getMonth()+3);dt.setDate(1);set("letzteErhDatum",dt.toISOString().split("T")[0]);set("letzteErhMiete",d.kaltmiete)}},[immLeer]);
  const R=useMemo(()=>{
    const kp=+d.kaufpreis||0,ga=+d.garage||0,gKP=kp+ga,qm=+d.flaeche||1,mi=+d.kaltmiete||0,ek=+d.eigenkapital||0;
    const zP=+d.zinssatz||0,tP=+d.tilgung||0,nP=+d.notar||0,mP=+d.makler||0;
    const gP=GREST[d.bundesland]||0,nu=+d.nichtUml||0,lM=+d.leerstand||0;
    const sP=+d.steuersatz||0,aP=+d.afaSatz||0,gA=+d.gebAnteil||0;
    const wP=+d.wertP||0,j=+d.jahre||10,so=+d.sonder||0,ren=+d.renovierung||0,vQ=+d.vergleichsmiete||0;
    const renGebKP=(+d.kaufpreis||0)*((+d.gebAnteil||80)/100);
    const ren15Grenze=renGebKP*0.15;
    const renUnterGrenze=ren>0&&ren<=ren15Grenze;
    const renUeberGrenze=ren>0&&ren>ren15Grenze;
    const renAfaJ=vermietet&&renUeberGrenze?(ren*(+d.afaSatz||2)/100):0;
    // Don't return null when kaufpreis=0 — show zeroes instead so res-pane stays visible
    const pQm=qm>0?gKP/qm:0,jM=mi*12,nbk=gKP*(gP+nP+mP)/100;
    const da=Math.max(0,gKP-ek),bel=gKP>0?da/gKP*100:0;
    const mz=zP/100/12,ann=da*(zP+tP)/100/12;
    let lz=0;if(mz>0&&ann>da*mz)lz=Math.log(ann/(ann-da*mz))/Math.log(1+mz)/12;
    const tM=j*12,lF=tM>0?Math.max(0,(tM-lM)/tM):1;
    const effJ=mi*lF,bR=gKP>0?jM/gKP*100:0;
    const nuJ=nu*12,nR=gKP>0?(effJ*12-nuJ)/gKP*100:0;
    const afJ=kp*(gA/100)*(aP/100)+renAfaJ;
    const k15=isK15(d.ort)||d.bundesland==="BE"||d.bundesland==="HH",kP=k15?15:20;
    const mt=vermietet?buildMP(mi,qm,vQ,kP,d.letzteErhDatum,+d.letzteErhMiete||0,j,k15,t):{rows:[],q:"",vmPA:0};
    const gRJ=(jj)=>{const yS=addY(new Date(),jj-1);let r=mi;for(let i=0;i<mt.rows.length;i++){if(mt.rows[i].datum<=yS)r=mt.rows[i].neueMiete;else break}return r};
    let rs=da,sZ=0,sT=0,sSt=0,sCF=0,sCFOhne=0,sM=0,sMB=0,beJ=null;
    const yearRows=[];
    for(let jj=1;jj<=j;jj++){
      const restStart=rs;
      const mJ=gRJ(jj)*lF,jMJ=mJ*12;
      const zi=rs*(zP/100),ti=Math.min(ann*12-zi,rs),zt2=zi+ti;
      const st2=(zi+afJ+nuJ+(jj===1&&vermietet&&renUnterGrenze?ren:0))*(sP/100);
      const cfOhneSt=jMJ-nuJ-zt2;        // ohne Steuerersparnis
      const cf=cfOhneSt+st2;              // mit Steuerersparnis
      sZ+=zi;sT+=ti;sSt+=st2;sCF+=cf;sCFOhne+=cfOhneSt;sM+=jMJ;sMB+=mi*lF*12;
      if(beJ===null&&sSt>=nbk)beJ=jj;
      yearRows.push({j:jj,rest:Math.max(0,restStart),zP,zinsen:zi,tilgB:ti,zt:zt2,steuer:st2,miete:jMJ,cf,cfOhneSt,cfKum:sCF});
      rs=Math.max(0,rs-ti);
    }
    const mehrMiet=sM-sMB;
    const w=gKP*(Math.pow(1+wP/100,j)-1),vw=gKP+w;
    const rsEnd=rs;
    const total=(vw-rsEnd)+sCF-ek-nbk-so-ren;          // Gesamtsaldo MIT Steuer
    const totalOhne=(vw-rsEnd)+sCFOhne-ek-nbk-so-ren;  // Gesamtsaldo OHNE Steuer
    // Monatlicher Cashflow — Jahr 1 Basis (für KPI-Schnellüberblick)
    const cf2OhneSt=(effJ-nu-ann);                              // OHNE Steuerersparnis
    const cf2MitSt =(effJ-nu-ann)+(yearRows[0]?.steuer||0)/12; // MIT Steuerersparnis
    const cf2=cf2OhneSt;
    const ekQ=gKP>0?ek/gKP*100:0;
    let rk=0;const rF=[];
    if(bel>95){rk+=30;rF.push("bel>95")}else if(bel>90){rk+=22;rF.push("bel>90")}else if(bel>80){rk+=12;rF.push("bel>80")}
    if(nR<1){rk+=20;rF.push("nR<1")}else if(nR<2){rk+=12;rF.push("nR<2")}else if(nR<3){rk+=5;rF.push("nR<3")}
    if(cf2<-500){rk+=15;rF.push("cf<-500")}else if(cf2<0){rk+=8;rF.push("cf<0")}
    if(zP>=5){rk+=12;rF.push("z≥5")}else if(zP>=4){rk+=6;rF.push("z≥4")}
    if(tP<1){rk+=18;rF.push("t<1")}else if(tP<2){rk+=8;rF.push("t<2")}
    if(isFinite(lz)&&lz>35){rk+=12;rF.push("lz>35")}else if(isFinite(lz)&&lz>30){rk+=6;rF.push("lz>30")}
    if(!isFinite(lz)){rk+=15;rF.push("lz=∞")}
    if(pQm>6000){rk+=8;rF.push("p>6k")}else if(pQm>5000){rk+=4;rF.push("p>5k")}
    if(ekQ<10){rk+=15;rF.push("ek<10")}else if(ekQ<20){rk+=5;rF.push("ek<20")}
    if(lM>tM*.08){rk+=8;rF.push("ls>8")}else if(lM>tM*.05){rk+=4;rF.push("ls>5")}
    if(k15)rk=Math.max(0,rk-5);
    if(bR>=5)rk=Math.max(0,rk-5);
    if(cf2>0)rk=Math.max(0,rk-3);
    rk=Math.min(100,Math.round(rk));
    return{pQm,bR,nR,ann,cf2,cf2OhneSt,cf2MitSt,lz,nbk,da,bel,afJ,sSt,g:total,gOhne:totalOhne,vw,w,rk,rF,gP,j,sCF,sCFOhne,beJ,z1:da*mz,t1:ann-da*mz,yearRows,mehrMiet,kP,k15,gKP,rsEnd,ekQ,ren,ren15Grenze,renUnterGrenze,renUeberGrenze};
  },[d,vermietet]);

  return <div><VT view={view} setView={setView}/><div className="split">
    <div className={`inp-pane ${view==="input"?"act":""}`}>
      <Sec title={t.oL} icon="📍"/>
      <Sel label={t.bundesland} value={d.bundesland} onChange={v=>set("bundesland",v)} options={BL_O}/>
      <PLZSearch/>
      <F label={t.kaufpreis} unit="€" value={d.kaufpreis} onChange={v=>set("kaufpreis",v)} tip={tip("kaufpreis")}/>
      <F label={t.garageKauf} unit="€" value={d.garage} onChange={v=>set("garage",v)} tip={tip("garage")}/>
      {(+d.garage||0)>0&&<div style={{fontSize:10,color:"var(--ch)",marginTop:-6,marginBottom:8,paddingLeft:4}}>{t.kaufpreis}: {fmtE((+d.kaufpreis||0)+(+d.garage||0))}</div>}
      <Row><F label={t.flaeche} unit="m²" value={d.flaeche} onChange={v=>set("flaeche",v)} tip={tip("flaeche")}/><F label={t.preisQm} unit="€/m²" value={R?fmt(R.pQm):"—"} readOnly hint={t.flaeche}/></Row>
      <F label={t.kaltmiete+" /m²"} unit="€/m²" value={d.mieteQm} onChange={v=>{lastEditedRef.current="qm";set("mieteQm",v)}} step="0.5" tip={tip("mieteQm")} hint={d.vergleichsmiete?`${t.vgl}: ${d.vergleichsmiete} €/m²`:""}/>
      <F label={t.kaltmiete} unit="€/Mon." value={d.kaltmiete} onChange={v=>{lastEditedRef.current="kalt";set("kaltmiete",v)}} tip={tip("kaltmiete")} hint={mieteQm>0?`= ${d.mieteQm} × ${d.flaeche} m²`:""}/>
      <Row><F label={t.nichtUml} unit="€/Mon." value={d.nichtUml} onChange={v=>set("nichtUml",v)} tip={tip("nichtUml")}/><F label={t.leerstand} unit="Mon." value={d.leerstand} onChange={v=>set("leerstand",v)} step="0.5" tip={tip("leerstand")}/></Row>
      <Sec title={t.fin} icon="🏦"/>

      <F label={t.eigenkapital} unit="€" value={d.eigenkapital} onChange={v=>set("eigenkapital",v)} tip={tip("eigenkapital")}/>
      <Row><F label={t.zinssatz} unit="% p.a." value={d.zinssatz} onChange={v=>set("zinssatz",v)} step="0.05" tip={tip("zinssatz")}/><F label={t.tilgung} unit="% p.a." value={d.tilgung} onChange={v=>set("tilgung",v)} step="0.05" tip={tip("tilgung")}/></Row>
      <Sel label={t.zinsbindung} value={d.zinsbindung} onChange={v=>set("zinsbindung",v)} options={[5,10,15,20,25,30].map(y=>({v:y,l:`${y} J.`}))}/>
      <Sec title={t.stNk} icon="📋"/>
      <Row><F label={t.grEst} unit="%" value={R?.gP||"—"} readOnly hint={d.bundesland?BL_N[d.bundesland]:""} tip={tip("grEst")}/><F label={t.notar} unit="%" value={d.notar} onChange={v=>set("notar",v)} step="0.1" tip={tip("notar")}/></Row>
      <F label={t.makler} unit="%" value={d.makler} onChange={v=>set("makler",v)} step="0.01" tip={tip("makler")}/>
      <Row><F label={t.steuersatz} unit="%" value={d.steuersatz} onChange={v=>set("steuersatz",v)} tip={tip("steuersatz")}/><F label={t.afa} unit="% p.a." value={d.afaSatz} onChange={v=>set("afaSatz",v)} step="0.5" tip={tip("afa")}/></Row>
      <Row><F label={t.grundAnteil} unit="%" value={d.grundAnteil} onChange={v=>{set("grundAnteil",v);set("gebAnteil",100-(+v||0))}} tip={tip("grundAnteil")}/><F label={t.gebAnteil} unit="%" value={d.gebAnteil} onChange={v=>{set("gebAnteil",v);set("grundAnteil",100-(+v||0))}} tip={tip("gebAnteil")}/></Row>
      <Sec title={t.wZ} icon="📈"/>
      <Row><F label={t.wertP} unit="% p.a." value={d.wertP} onChange={v=>set("wertP",v)} step="0.1" tip={tip("wertP")}/><Sel label={t.jahre} value={d.jahre} onChange={v=>set("jahre",v)} options={[5,10,15,20,25,30].map(y=>({v:y,l:`${y} J.`}))}/></Row>
      <F label={t.sonderUml} unit="€" value={d.sonder} onChange={v=>set("sonder",v)} tip={tip("sonder")}/>
      <F label={t.renovierung} unit="€" value={d.renovierung} onChange={v=>set("renovierung",v)} tip={tip("renovierung")}/>
      {(()=>{
        const ren=+d.renovierung||0;
        if(ren<=0)return null;
        if(!vermietet)return(
          <div style={{fontSize:10,color:"var(--ch)",marginTop:-6,marginBottom:8,paddingLeft:4}}>
            ℹ️ {t.renovEigennutz}
          </div>
        );
        const schwelle=R?.ren15Grenze||0;
        const unterGrenze=R?.renUnterGrenze;
        const ueberGrenze=R?.renUeberGrenze;
        return(
          <div style={{padding:"9px 12px",borderRadius:10,marginBottom:10,marginTop:-4,
            background:unterGrenze?"#F0FAF3":ueberGrenze?"#FFF7ED":"#F8F9FA",
            border:`1px solid ${unterGrenze?"#86EFAC":ueberGrenze?"#FBB97D":"#e5e7eb"}`}}>
            <div style={{fontSize:10,fontWeight:700,color:unterGrenze?"#15803d":ueberGrenze?"#b45309":"var(--ct)",marginBottom:3}}>
              {unterGrenze?t.renovSofort:t.renovAktiv}
            </div>
            <div style={{fontSize:9,color:"var(--ch)"}}>
              {t.renovGrenzHinw}: {fmtE(Math.round(schwelle))} ({fmtP((+d.gebAnteil||80),0)} × 15%)
            </div>
          </div>
        );
      })()}
      <Sec title={t.mR} icon="⚖️"/>
      <Sel label={t.vermietQ} value={d.vermietet||"ja"} onChange={v=>set("vermietet",v)} options={[{v:"ja",l:t.vermietJa},{v:"nein",l:t.vermietNein}]}/>
      {vermietet&&<>
        <F label={t.vgl} unit="€/m²" value={d.vergleichsmiete} onChange={v=>set("vergleichsmiete",v)} step="0.5" tip={tip("vgl")}/>
        <Sel label={t.immLeerQ} value={d.immLeer||"nein"} onChange={v=>set("immLeer",v)} options={[{v:"nein",l:t.immLeerJa},{v:"ja",l:t.immLeerNein}]}/>
        {immLeer&&<div style={{padding:"8px 10px",background:"#FFF8E6",borderRadius:8,fontSize:11,color:"#8a6d10",marginBottom:10,border:"1px solid #F5E4A8"}}>
          ℹ️ {t.immLeerNein}: {t.lDat} + 3 {t.jPl}
        </div>}
        {!immLeer&&<Row><F label={t.lDat} value={d.letzteErhDatum} onChange={v=>set("letzteErhDatum",v)} type="date" tip={tip("lDat")}/><F label={t.lMiet} unit="€" value={d.letzteErhMiete} onChange={v=>set("letzteErhMiete",v)} tip={tip("lMiet")}/></Row>}
      </>}
      <button className="mob-next-btn" onClick={()=>{setView("result");setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50)}}>{t.ergebnis} →</button>
    </div>
    <div className={`res-pane ${view==="result"?"act":""}`}>
      {!R?<div style={{textAlign:"center",padding:"60px 20px",color:"var(--ch)"}}><div style={{fontSize:40,opacity:.12}}>🏠</div></div>:<>
        <div style={{display:"flex",alignItems:"center",gap:8,margin:"0 0 14px",paddingBottom:10,borderBottom:"2px solid var(--ca)"}}>
          <span style={{fontSize:16,fontWeight:700,color:"var(--ct)",letterSpacing:-.3}}>{t.kennzahlen}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div style={{background:(R.gOhne||0)>=0?"#e8f5e9":"#fff3e0",borderRadius:10,padding:"10px 12px",border:`1px solid ${(R.gOhne||0)>=0?"#a5d6a7":"#ffcc80"}`}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:.8,color:(R.gOhne||0)>=0?"#2e7d32":"#e65100",marginBottom:4,textTransform:"uppercase"}}>{t.saldoOhne}</div>
            <div style={{fontSize:18,fontWeight:800,color:(R.gOhne||0)>=0?"#2e7d32":"#e65100",fontVariantNumeric:"tabular-nums"}}>{(R.gOhne||0)>=0?"+":""}{fmtE(R.gOhne||0)}</div>
            <div style={{fontSize:10,color:"var(--ch)",marginTop:2}}>EK-R: {fmtP(+d.eigenkapital>0?(R.gOhne||0)/(+d.eigenkapital)*100:0,1)} ({fmtP(+d.eigenkapital>0?(R.gOhne||0)/(+d.eigenkapital)*100/R.j:0,1)} p.a.)</div>
          </div>
          <div style={{background:R.g>=0?"#e8f5e9":"#fff3e0",borderRadius:10,padding:"10px 12px",border:`1px solid ${R.g>=0?"#a5d6a7":"#ffcc80"}`}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:.8,color:R.g>=0?"#2e7d32":"#e65100",marginBottom:4,textTransform:"uppercase"}}>{t.saldoMit}</div>
            <div style={{fontSize:18,fontWeight:800,color:R.g>=0?"#2e7d32":"#e65100",fontVariantNumeric:"tabular-nums"}}>{R.g>=0?"+":""}{fmtE(R.g)}</div>
            <div style={{fontSize:10,color:"var(--ch)",marginTop:2}}>EK-R: {fmtP(+d.eigenkapital>0?R.g/(+d.eigenkapital)*100:0,1)} ({fmtP(+d.eigenkapital>0?R.g/(+d.eigenkapital)*100/R.j:0,1)} p.a.)</div>
          </div>
        </div>
        <div className="if-row" style={{marginBottom:14}}>

          {/* Bruttorendite + Ampel */}
          <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:`1.5px solid ${AMPEL.bruttoR(R.bR)}`}}>
            <div style={{fontSize:11,color:"var(--ch)",fontWeight:500,textTransform:"uppercase",letterSpacing:.8,marginBottom:4,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              {t.bruttoR}<Dot color={AMPEL.bruttoR(R.bR)}/>
            </div>
            <div style={{fontSize:22,fontWeight:700,color:"var(--ct)",fontVariantNumeric:"tabular-nums"}}>{fmtP(R.bR)}</div>
            <div style={{fontSize:11,color:AMPEL.bruttoR(R.bR),fontWeight:600,marginTop:4}}>
              {R.bR>=5?"✓ "+t.brGreen:R.bR>=4?"~ "+t.brYellow:"⚠ "+t.brRed}
            </div>
            <div style={{fontSize:10,color:"var(--ch)",marginTop:3,lineHeight:1.4}}>
              {R.bR>=5?t.brGreenTip:R.bR>=4?t.brYellowTip:t.brRedTip}
            </div>
          </div>

          {/* Nettorendite + Ampel */}
          <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:`1.5px solid ${AMPEL.nettoR(R.nR)}`}}>
            <div style={{fontSize:11,color:"var(--ch)",fontWeight:500,textTransform:"uppercase",letterSpacing:.8,marginBottom:4,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              {t.nettoR}<Dot color={AMPEL.nettoR(R.nR)}/>
            </div>
            <div style={{fontSize:22,fontWeight:700,color:"var(--ct)",fontVariantNumeric:"tabular-nums"}}>{fmtP(R.nR)}</div>
            <div style={{fontSize:11,color:AMPEL.nettoR(R.nR),fontWeight:600,marginTop:4}}>
              {R.nR>=3.5?"✓ "+t.nrGreen:R.nR>=2.5?"~ "+t.nrYellow:"⚠ "+t.nrRed}
            </div>
            <div style={{fontSize:10,color:"var(--ch)",marginTop:3,lineHeight:1.4}}>
              {R.nR>=3.5?t.nrGreenTip:R.nR>=2.5?t.nrYellowTip:t.nrRedTip}
            </div>
          </div>

          {/* CF ohne Steuer + Ampel */}
          <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:`1.5px solid ${AMPEL.cfOhne(R.cf2OhneSt)}`}}>
            <div style={{fontSize:11,color:"var(--ch)",fontWeight:500,textTransform:"uppercase",letterSpacing:.8,marginBottom:4,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              {t.cfOhneSt}<Dot color={AMPEL.cfOhne(R.cf2OhneSt)}/>
            </div>
            <div style={{fontSize:22,fontWeight:700,color:R.cf2OhneSt>=0?"var(--ca)":"#ef4444",fontVariantNumeric:"tabular-nums"}}>{fmtE(R.cf2OhneSt)}</div>
            <div style={{fontSize:11,color:AMPEL.cfOhne(R.cf2OhneSt),fontWeight:600,marginTop:4}}>
              {R.cf2OhneSt>0?"✓ "+t.cfOGreen:R.cf2OhneSt>=-100?"~ "+t.cfOYellow:"⚠ "+t.cfORed}
            </div>
            <div style={{fontSize:10,color:"var(--ch)",marginTop:3,lineHeight:1.4}}>
              {R.cf2OhneSt>0?t.cfOGreenTip:R.cf2OhneSt>=-100?t.cfOYellowTip:t.cfORedTip}
            </div>
          </div>

          {/* CF mit Steuer + Ampel */}
          <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:`1.5px solid ${AMPEL.cfMit(R.cf2MitSt)}`}}>
            <div style={{fontSize:11,color:"var(--ch)",fontWeight:500,textTransform:"uppercase",letterSpacing:.8,marginBottom:4,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              {t.cfMitSt}<Dot color={AMPEL.cfMit(R.cf2MitSt)}/>
            </div>
            <div style={{fontSize:22,fontWeight:700,color:R.cf2MitSt>=0?"#22c55e":"#ef4444",fontVariantNumeric:"tabular-nums"}}>{fmtE(R.cf2MitSt)}</div>
            <div style={{fontSize:11,color:AMPEL.cfMit(R.cf2MitSt),fontWeight:600,marginTop:4}}>
              {R.cf2MitSt>0?"✓ "+t.cfMGreen:R.cf2MitSt>=-100?"~ "+t.cfMYellow:"⚠ "+t.cfMRed}
            </div>
            <div style={{fontSize:10,color:"var(--ch)",marginTop:3,lineHeight:1.4}}>
              {R.cf2MitSt>0?t.cfMGreenTip:R.cf2MitSt>=-100?t.cfMYellowTip:t.cfMRedTip}
            </div>
          </div>

          {/* Monatliche Rate (neutral) */}
          <KPI label={t.rate} value={fmtE(R.ann)} sub={`${t.zins} ${fmtE(R.z1)} + ${t.tilgK} ${fmtE(R.t1)}`}/>

          {/* Beleihungsauslauf + Ampel */}
          <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:`1.5px solid ${AMPEL.bel(R.bel)}`}}>
            <div style={{fontSize:11,color:"var(--ch)",fontWeight:500,textTransform:"uppercase",letterSpacing:.8,marginBottom:4,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              {t.bel}<Dot color={AMPEL.bel(R.bel)}/>
            </div>
            <div style={{fontSize:22,fontWeight:700,color:"var(--ct)",fontVariantNumeric:"tabular-nums"}}>{fmtP(R.bel)}</div>
            <div style={{fontSize:11,color:AMPEL.bel(R.bel),fontWeight:600,marginTop:4}}>
              {R.bel<70?"✓ "+t.belGreen:R.bel<85?"~ "+t.belYellow:"⚠ "+t.belRed}
            </div>
            <div style={{fontSize:10,color:"var(--ch)",marginTop:3,lineHeight:1.4}}>
              {R.bel<70?t.belGreenTip:R.bel<85?t.belYellowTip:t.belRedTip}
            </div>
          </div>

          {/* Kreditlaufzeit + Ampel */}
          <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:`1.5px solid ${AMPEL.lz(R.lz)}`}}>
            <div style={{fontSize:11,color:"var(--ch)",fontWeight:500,textTransform:"uppercase",letterSpacing:.8,marginBottom:4,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              {t.laufzeit}<Dot color={AMPEL.lz(R.lz)}/>
            </div>
            <div style={{fontSize:22,fontWeight:700,color:"var(--ct)",fontVariantNumeric:"tabular-nums"}}>{isFinite(R.lz)?`${fmt(R.lz,1)} J.`:"∞"}</div>
            <div style={{fontSize:11,color:AMPEL.lz(R.lz),fontWeight:600,marginTop:4}}>
              {!isFinite(R.lz)?"⚠ "+t.lzInf:R.lz>35?"⚠ "+t.lzRed:R.lz>25?"~ "+t.lzYellow:"✓ "+t.lzGreen}
            </div>
            <div style={{fontSize:10,color:"var(--ch)",marginTop:3,lineHeight:1.4}}>
              {!isFinite(R.lz)?t.lzInfTip:R.lz>35?t.lzRedTip:R.lz>25?t.lzYellowTip:t.lzGreenTip}
            </div>
          </div>

          {/* Kaufnebenkosten (neutral) */}
          <KPI label={t.nbk} value={fmtE(R.nbk)} sub={`${fmtP((R.nbk/R.gKP)*100)} des Kaufpreises`}/>

          {/* Darlehen (neutral) */}
          <KPI label={t.darlehen} value={fmtE(R.da)} sub={`EK-Quote: ${fmtP(R.ekQ)}`}/>

          {/* Steuerersparnis (neutral) */}
          <KPI label={t.steuerErs} value={fmtE(R.sSt/R.j)} sub={`AfA: ${fmtE(R.afJ)}/J.`}/>

        </div>
        {/* Selbstträger-Check — vollbreite Hero-Karte */}
        <BreakEvenCards R={R}/>
        <LineChart rows={R.yearRows} zbJ={+d.zinsbindung||10}/>
        <YearTable rows={R.yearRows} zbJ={+d.zinsbindung||10}/>
        <Detail R={R} d={d}/>
        <RBar score={R.rk} factors={R.rF}/>
        <div style={{marginBottom:14}}>
          <div style={{fontSize:11,fontWeight:600,color:"var(--ct)",marginBottom:8}}>{t.check}</div>
          {R.bR>=5&&<Ins emoji="✅" text={`${t.bruttoR} ${fmtP(R.bR)} — ${t.gut}`} type="good"/>}
          {R.bR<4&&<Ins emoji="⚠️" text={`${t.bruttoR} ${fmtP(R.bR)} — ${t.krit}`} type="warn"/>}
          {R.cf2<0?<Ins emoji="💸" text={`${t.cashflow}: ${fmtE(R.cf2)}/Mon.`} type="bad"/>:<Ins emoji="💰" text={`${t.cashflow}: ${t.pos}`} type="good"/>}
          {R.bel>80&&<Ins emoji="🏦" text={`${t.bel} ${fmtP(R.bel)} — > 80%`} type="warn"/>}
          {R.lz>30&&<Ins emoji="⏳" text={`${t.laufzeit} > 30 J.`} type="warn"/>}
          {R.beJ&&<Ins emoji="📊" text={`${t.steuerNeutral} ${R.beJ} ${t.steuerNeutralSub}`} type="info"/>}
          {R.g>=0&&<Ins emoji="🎯" text={`${t.positivSaldo}: ${fmtE(R.g)} — ${R.j} ${t.jPl}`} type="good"/>}
          {R.g<0&&<Ins emoji="🚫" text={`${t.saldoMit}: ${fmtE(Math.abs(R.g))} — ${t.kaufpreis}, ${t.kaltmiete}, ${t.eigenkapital}`} type="bad"/>}
          {!vermietet&&<Ins emoji="🏠" text={t.cfBasis} type="info"/>}
        </div>
        <div style={{marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.advTitle}</div>
        {R.bR>0&&R.nR>0&&(R.bR-R.nR)>2&&<Ins emoji="📊" text={t.adv1} type="warn"/>}
        {R.bR>0&&(+d.kaltmiete)>0&&(R.gKP/((+d.kaltmiete)*12))>30&&<Ins emoji="🏷️" text={t.adv2} type="warn"/>}
        {R.nR>0&&R.nR<(+d.zinssatz)&&<Ins emoji="📉" text={t.adv3} type="bad"/>}
        {(+d.steuersatz)>42&&R.bel>60&&<Ins emoji="💼" text={t.adv4} type="info"/>}
        {(+d.grundAnteil)>40&&<Ins emoji="📋" text={t.adv5} type="info"/>}
        {(+d.leerstand)>0&&R.bR>0&&((+d.leerstand)/((+d.jahre||10)*12)*100)>5&&R.cf2OhneSt<0&&<Ins emoji="🏠" text={t.adv6} type="bad"/>}
      </div>
      <ExportPDF title={t.haupt}/>
        <Legal items={LEG.rendite}/>
      </>}
    </div>
  </div></div>;
}


// ═══ KREDIT (mit Sondertilgung + Beratung) ═══
function Kredit(){
  const{d,set,t,tip}=useApp();
  const[view,setView]=useState("input");
  const[sondTP,setSondTP]=useState("5");

  const R=useMemo(()=>{
    const kp=+d.kaufpreis||0,ga=+d.garage||0,gKP=kp+ga,ek=+d.eigenkapital||0;
    const zP=+d.zinssatz||0,tP=+d.tilgung||0,zbJ=+d.zinsbindung||10;
    const gP=GREST[d.bundesland]||0,nP=+d.notar||0,mP=+d.makler||0;
    if(kp<=0)return null;
    const da=Math.max(0,gKP-ek),nbk=gKP*(gP+nP+mP)/100;
    const bel=kp>0?da/kp*100:0,mz=zP/100/12;
    const ann=da*(zP+tP)/100/12;
    let lz=0;
    if(mz>0&&ann>da*mz)lz=Math.log(ann/(ann-da*mz))/Math.log(1+mz)/12;
    let rs=da,sZ=0,rows=[],rZB=da;
    const mJ=Math.min(isFinite(lz)?Math.ceil(lz)+1:60,60);
    for(let j=1;j<=mJ;j++){
      const z=rs*(zP/100),t2=Math.min(ann*12-z,rs);
      sZ+=z;
      rs=Math.max(0,rs-Math.max(0,t2));
      if(j===zbJ)rZB=rs;
      rows.push({j,z,t:Math.max(0,t2),rest:rs,isZB:j===zbJ});
      if(rs<=0)break;
    }
    const z1=da*mz,t1=ann-z1;
    const sondP=+sondTP||0,sondE=da*sondP/100;
    let rs2=da,sZ2=0,years2=0;
    const mZm=zP/100/12,annM=da*(zP+tP)/100/12;
    while(rs2>0&&years2<60){
      years2++;
      for(let m=0;m<12&&rs2>0;m++){
        const zi=rs2*mZm;
        const ti=Math.min(annM-zi,rs2);
        if(ti<=0){years2=Infinity;break}
        sZ2+=zi;
        rs2=Math.max(0,rs2-ti);
      }
      if(!isFinite(years2))break;
      if(sondE>0&&rs2>0)rs2=Math.max(0,rs2-sondE);
    }
    const zinsenGespart=sZ-sZ2;
    const jahreGespart=isFinite(years2)?lz-years2:0;
    return{da,nbk,bel,ann,lz,sZ,rZB,rows,z1,t1,gP,zbJ,gA:da+sZ+nbk,sondP,sondE,sZ2,years2,zinsenGespart,jahreGespart};
  },[d,sondTP]);

  return <div><VT view={view} setView={setView}/><div className="split">
    <div className={`inp-pane ${view==="input"?"act":""}`}>
      <Sec title={`${t.kaufpreis} & ${t.eigenkapital}`} icon="🏠"/>
      <F label={t.kaufpreis} unit="€" value={d.kaufpreis} onChange={v=>set("kaufpreis",v)} tip={tip("kaufpreis")}/>
      <Row><F label={t.eigenkapital} unit="€" value={d.eigenkapital} onChange={v=>set("eigenkapital",v)} tip={tip("eigenkapital")}/><F label={t.darlehen} unit="€" value={R?fmt(R.da):"—"} readOnly/></Row>
      <Sec title={t.nbk} icon="📋"/>
      <Row><F label={t.grEst} unit="%" value={R?.gP||"—"} readOnly tip={tip("grEst")}/><F label={t.notar} unit="%" value={d.notar} onChange={v=>set("notar",v)} step="0.1" tip={tip("notar")}/></Row>
      <Row><F label={t.makler} unit="%" value={d.makler} onChange={v=>set("makler",v)} step="0.01" tip={tip("makler")}/><F label="NBK ges." unit="€" value={R?fmt(R.nbk):"—"} readOnly/></Row>
      <Sec title={t.fin} icon="🏦"/>
      <Row><F label={t.zinssatz} unit="% p.a." value={d.zinssatz} onChange={v=>set("zinssatz",v)} step="0.05" tip={tip("zinssatz")}/><F label={t.tilgung} unit="% p.a." value={d.tilgung} onChange={v=>set("tilgung",v)} step="0.05" tip={tip("tilgung")}/></Row>
      <Sel label={t.zinsbindung} value={d.zinsbindung} onChange={v=>set("zinsbindung",v)} options={[5,10,15,20,25,30].map(y=>({v:y,l:`${y} J.`}))}/>
      <button className="mob-next-btn" onClick={()=>{setView("result");setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50)}}>{t.ergebnis} →</button>
    </div>
    <div className={`res-pane ${view==="result"?"act":""}`}>
      {!R?<div style={{textAlign:"center",padding:"60px 20px",color:"var(--ch)"}}>🏦</div>:<>
        <div style={{background:"linear-gradient(135deg,var(--ca),var(--ca-dk))",borderRadius:14,padding:"18px 16px",color:"#fff",marginBottom:14}}>
          <div style={{fontSize:10,opacity:.8,textTransform:"uppercase"}}>{t.rate}</div>
          <div style={{fontSize:26,fontWeight:700,marginTop:4}}>{fmtE(R.ann)}</div>
          <div style={{display:"flex",gap:20,marginTop:12}}>
            <div><div style={{fontSize:9,opacity:.6}}>{t.zins}</div><div style={{fontSize:14,fontWeight:600}}>{fmtE(R.z1)}/Mo.</div></div>
            <div><div style={{fontSize:9,opacity:.6}}>{t.tilgK}</div><div style={{fontSize:14,fontWeight:600}}>{fmtE(R.t1)}/Mo.</div></div>
          </div>
        </div>
        <div className="if-row" style={{marginBottom:14}}>
          <KPI label={t.darlehen} value={fmtE(R.da)} sub={`${t.bel}: ${fmtP(R.bel)}`}/>
          <KPI label={t.laufzeit} value={isFinite(R.lz)?`${fmt(R.lz,1)} J.`:"—"}/>
          <KPI label={t.gZin} value={fmtE(R.sZ)}/>
          <KPI label={t.nbk} value={fmtE(R.nbk)}/>
          <KPI label={t.gAuf} value={fmtE(R.gA)}/>
          <KPI label={t.rest} value={fmtE(R.rZB)} sub={`nach ${R.zbJ} J.`}/>
        </div>
        <div style={{background:"var(--cc)",borderRadius:12,padding:"12px",border:"1px solid var(--cb)",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:11,fontWeight:600}}>{t.bel}</span>
            <span style={{fontSize:13,fontWeight:600,color:R.bel>90?"#ef4444":R.bel>80?"#f59e0b":"#22c55e"}}>{fmtP(R.bel)}</span>
          </div>
          <div style={{height:6,borderRadius:3,background:"var(--cb)",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${Math.min(R.bel,100)}%`,borderRadius:3,background:R.bel>90?"#ef4444":R.bel>80?"#f59e0b":"var(--ca)"}}/>
          </div>
          <div style={{fontSize:10,color:"var(--ch)",marginTop:4}}>{R.bel>90?t.belCond90:R.bel>80?t.belCond80:t.belCondOk}</div>
        </div>
        <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"2px solid var(--ca)",marginBottom:12}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
            <span style={{fontSize:14,fontWeight:600}}>💰 {t.sondTilgLabel}</span>
            <Tip text={tip("sondertilg")}/>
          </div>
          <div style={{fontSize:10,color:"var(--ch)",marginBottom:10}}>{t.sondTilgSub}</div>
          <Row>
            <F label={t.vereinbSatz} unit="%" value={sondTP} onChange={setSondTP} step="1"/>
            <F label={t.entspricht} unit="€/Jahr" value={fmt(R.sondE)} readOnly/>
          </Row>
          <div style={{fontSize:11,color:"var(--ch)",marginTop:2,marginBottom:10}}>{t.stdSond}</div>
          {R.sondE>0&&isFinite(R.years2)&&<div style={{background:"var(--ci)",borderRadius:8,padding:"10px 12px",fontSize:12}}>
            <div style={{fontWeight:600,color:"var(--ca)",marginBottom:6}}>{t.effekt} {fmt(R.sondP)}% = {fmtE(R.sondE)}/J.:</div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>{t.neueLaufzeit}</span><span style={{fontWeight:600,color:"#22c55e"}}>{fmt(R.years2,1)} J. ({t.statt} {fmt(R.lz,1)} J.)</span></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>{t.zinsenGespart}</span><span style={{fontWeight:600,color:"#22c55e"}}>{fmtE(R.zinsenGespart)}</span></div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>{t.jahre}</span><span style={{fontWeight:600,color:"#22c55e"}}>{fmt(R.jahreGespart,1)} J.</span></div>
          </div>}
        </div>
        <div style={{background:"var(--cc)",borderRadius:12,padding:"12px",border:"1px solid var(--cb)",marginBottom:12,overflow:"auto"}}>
          <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.tPl}</div>
          <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:"1px solid var(--cb)"}}>{[t.jahre.slice(0,2),t.rate,t.gZin,t.tilgung,t.rest].map(h=><th key={h} style={{padding:"3px 4px",textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{h}</th>)}</tr></thead>
            <tbody>{R.rows.slice(0,30).map(r=><tr key={r.j} style={{borderBottom:"1px solid var(--cb)",background:r.isZB?"var(--ci)":"transparent"}}>
              <td style={{padding:"3px 4px"}}>{r.j}{r.isZB?" ◀":""}</td>
              <td style={{padding:"3px 4px",textAlign:"right"}}>{fmtE(R.ann*12)}</td>
              <td style={{padding:"3px 4px",textAlign:"right",color:"#ef4444"}}>{fmtE(r.z)}</td>
              <td style={{padding:"3px 4px",textAlign:"right"}}>{fmtE(r.t)}</td>
              <td style={{padding:"3px 4px",textAlign:"right"}}>{r.rest>0?fmtE(r.rest):"✅"}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.advTitle}</div>
          {R.restZB>0&&R.da>0&&(R.restZB/R.da)>0.6&&<Ins emoji="⚠️" text={t.adv7} type="bad"/>}
          {(+d.zinsbindung)<10&&(+d.zinssatz)>3.5&&<Ins emoji="🛡️" text={t.adv8} type="warn"/>}
          {(+d.tilgung)<2&&<Ins emoji="🐌" text={t.adv9} type="warn"/>}
          {R.lz>25&&R.sondP===0&&<Ins emoji="💰" text={t.adv10} type="info"/>}
          {R.bel>=80&&R.bel<=90&&<Ins emoji="🏦" text={t.adv11} type="info"/>}
        </div>
        <ExportPDF title={t.kredit}/>
        <Legal items={LEG.kredit}/>
      </>}
    </div>
  </div></div>;
}

// ═══ MIETERHÖHUNG (mit Beratung) ═══
function Miete(){
  const{d,set,t,tip,lang}=useApp();
  const[view,setView]=useState("input");
  const R=useMemo(()=>{
    const mi=+d.kaltmiete||0,qm=+d.flaeche||1,vQ=+d.vergleichsmiete||0,j=+d.mietJahre||10;
    if(mi<=0)return null;
    const k15=isK15(d.ort)||d.bundesland==="BE"||d.bundesland==="HH",kP=k15?15:20;
    const mt=buildMP(mi,qm,vQ,kP,d.letzteErhDatum,+d.letzteErhMiete||0,j,k15);
    return{...mt,kP,k15,mi,vQ,vm:vQ>0?vQ*qm:null};
  },[d]);

  return <div><VT view={view} setView={setView}/><div className="split">
    <div className={`inp-pane ${view==="input"?"act":""}`}>
      <Sec title={t.oL} icon="📍"/>
      <PLZSearch/>
      <Sec title={t.kaltmiete} icon="💰"/>
      <F label={t.kaltmiete} unit="€/Mon." value={d.kaltmiete} onChange={v=>set("kaltmiete",v)} tip={tip("kaltmiete")}/>
      <Row><F label={t.flaeche} unit="m²" value={d.flaeche} onChange={v=>set("flaeche",v)} tip={tip("flaeche")}/><F label={t.vgl} unit="€/m²" value={d.vergleichsmiete} onChange={v=>set("vergleichsmiete",v)} step="0.5" tip={tip("vgl")}/></Row>
      <Sec title={t.lDat} icon="📅"/>
      <Row><F label={t.lDat} value={d.letzteErhDatum} onChange={v=>set("letzteErhDatum",v)} type="date" tip={tip("lDat")}/><F label={t.lMiet} unit="€" value={d.letzteErhMiete} onChange={v=>set("letzteErhMiete",v)} tip={tip("lMiet")}/></Row>
      <Sel label={t.jahre} value={d.mietJahre||"10"} onChange={v=>set("mietJahre",v)} options={[5,10,15,20].map(y=>({v:y,l:`${y} J.`}))}/>
      <button className="mob-next-btn" onClick={()=>{setView("result");setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50)}}>{t.ergebnis} →</button>
    </div>
    <div className={`res-pane ${view==="result"?"act":""}`}>
      {!R?<div style={{textAlign:"center",padding:"60px 20px",color:"var(--ch)"}}>💰</div>:<>
        <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"1px solid var(--cb)",marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.kapp}</div>
          <div style={{fontSize:12,lineHeight:1.8}}>
            {[[t.ort,d.ort||"—"],[t.kapp,<span style={{fontWeight:600,color:"var(--ca)"}}>{R.kP}% in 3 J.</span>],[t.markt,R.k15?"🔴 "+t.ang:"🟢 "+t.std],...(R.vm?[[t.vgl,fmtE(R.vm)+"/Mon."]]:[])].map(([k,v],i)=><div key={i} style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"var(--ch)"}}>{k}</span><span>{v}</span></div>)}
          </div>
        </div>
        {R.rows.length>0?(()=>{
          const nx=R.rows[0],jz=nx.datum<=new Date();
          return <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"1px solid var(--cb)",marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.nE}</div>
            <div style={{fontSize:12,lineHeight:1.8}}>
              {[[t.dat,<span style={{fontWeight:600,color:"var(--ca)"}}>{fmtDat(nx.datum,lang)}</span>],[t.akt,fmtE(nx.aktMiete)+"/Mon."],[t.mxE,<span style={{color:"#22c55e"}}>{nx.mE>0?`+${fmtE(nx.mE)}`:"—"}</span>],[t.nM,<span style={{fontWeight:600,color:"var(--ca)"}}>{fmtE(nx.neueMiete)}/Mon.</span>]].map(([k,v],i)=><div key={i} style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"var(--ch)"}}>{k}</span><span>{v}</span></div>)}
            </div>
            <div style={{marginTop:8,padding:"6px 10px",borderRadius:6,fontSize:11,background:jz?"#E8F8EE":"#FFF8E6",color:jz?"#1a7a3a":"#8a6d10"}}>{jz?`✅ ${t.jM}`:`⏳ ${t.ab} ${fmtDat(nx.datum,lang)}`}</div>
          </div>;
        })():<Ins emoji="ℹ️" text={t.keE} type="info"/>}
        {R.rows.length>0&&<div style={{background:"var(--cc)",borderRadius:12,padding:"12px",border:"1px solid var(--cb)",marginBottom:12,overflow:"auto"}}>
          <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.mPl}</div>
          <table style={{width:"100%",fontSize:11,borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:"1px solid var(--cb)"}}>{[t.dat,t.akt,t.vgl,t.erh,t.nM,t.sta].map(h=><th key={h} style={{padding:"3px 4px",textAlign:"right",fontWeight:500,color:"var(--ch)"}}>{h}</th>)}</tr></thead>
            <tbody>{R.rows.map((r,i)=><tr key={i} style={{borderBottom:"1px solid var(--cb)"}}>
              <td style={{padding:"3px 4px"}}>{fmtDat(r.datum,lang)}</td>
              <td style={{padding:"3px 4px",textAlign:"right"}}>{fmtE(r.aktMiete)}</td>
              <td style={{padding:"3px 4px",textAlign:"right",color:"var(--ch)"}}>{r.vmProg?fmtE(Math.round(r.vmProg)):"—"}</td>
              <td style={{padding:"3px 4px",textAlign:"right",color:r.mE>0?"#22c55e":"var(--ch)"}}>{r.mE>0?`+${fmtE(r.mE)}`:"—"}</td>
              <td style={{padding:"3px 4px",textAlign:"right",color:"var(--ca)"}}>{fmtE(r.neueMiete)}</td>
              <td style={{padding:"3px 4px",textAlign:"right",color:r.sC==="pos"?"#22c55e":"#ef4444"}}>{r.status}</td>
            </tr>)}</tbody>
          </table>
          <div style={{fontSize:10,color:"var(--ch)",marginTop:6}}>{R.vQ>0?`📊 Ø +${fmt(R.vmPA,1)}% p.a. | ${R.q}`:""}</div>
        </div>}
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.advTitle}</div>
          {(()=>{const nx=R.rows&&R.rows[0];const mi=+d.kaltmiete||0;const vm=+d.vergleichsmiete||0;const lD=d.letzteErhDatum?new Date(d.letzteErhDatum):null;const jetzt=new Date();const jahre3=lD?((jetzt-lD)/(1000*60*60*24*365.25)):99;return(<>{vm>0&&mi>0&&mi<vm*0.85&&nx&&nx.verfK>0&&<Ins emoji="📈" text={t.adv12} type="info"/>}{jahre3>3&&<Ins emoji="🔄" text={t.adv13} type="good"/>}{nx&&nx.verfK<=0&&vm>0&&mi<vm*0.95&&<Ins emoji="⏳" text={t.adv14} type="warn"/>}{R.k15&&vm>0&&mi>=vm*0.9&&<Ins emoji="🔧" text={t.adv15} type="info"/>}</>);})()}
        </div>
        <ExportPDF title={t.miete}/>
        <Legal items={LEG.miete}/>
      </>}
    </div>
  </div></div>;
}


// ═══ SANIERUNG (3-Stufen, erweiterte Maßnahmen, GEG, Amortisation) ═══
const EC_O=["A+","A","B","C","D","E","F","G","H"];
const EC_C=["#0D6E3A","#2E9E52","#6DBE45","#A7CE3F","#F7CE1F","#F6A623","#E97020","#DD3A1E","#B01414"];
const kw2ec=k=>{if(k<=30)return 0;if(k<=50)return 1;if(k<=75)return 2;if(k<=100)return 3;if(k<=130)return 4;if(k<=160)return 5;if(k<=200)return 6;if(k<=250)return 7;return 8};

const SAN_TIERS={
  fenster:{s:{p:800,l:"sTierFenS"},g:{p:1200,l:"sTierFenG"},m:{p:1600,l:"sTierFenM"}},
  fensterXL:{s:{p:2500},g:{p:4500},m:{p:7000}},
  fensterHST:{s:{p:5000},g:{p:7000},m:{p:9000}},
  fassade:{s:{p:12200,l:"sTierFasS",d:10},g:{p:15900,l:"sTierFasG",d:16},m:{p:21400,l:"sTierFasM",d:20}},
  heizung:{s:{p:25000,l:"sTierHzS"},g:{p:33000,l:"sTierHzG"},m:{p:45000,l:"sTierHzM"}},
  dach:{s:{p:11200,l:"sTierDaS"},g:{p:14600,l:"sTierDaG"},m:{p:16800,l:"sTierDaM"}},
  tuer:{s:{p:3500,l:"sTierTuS"},g:{p:7000,l:"sTierTuG"},m:{p:11000,l:"sTierTuM"}},
  pv:{s:{p:10100,l:"sTierPvS"},g:{p:16100,l:"sTierPvG"},m:{p:24200,l:"sTierPvM"}},
  lueftung:{s:{p:6000,l:"sTierLuS"},g:{p:9500,l:"sTierLuG"},m:{p:14000,l:"sTierLuM"}}
};

const SAN_SRC_KEYS={
  fenster:"sSrcBafa",fassade:"sSrcBafa",
  heizung:"sSrcHz",dach:"sSrcBafa",
  tuer:"sSrcBafa",pv:"sSrcPv",
  keller:"sSrcBafa",ogdecke:"sSrcBafa",
  batterie:"sSrcBat",lueftung:"sSrcBafa"
};

const landF={BW:"L-Bank BW",BY:"BayernLabo",BE:"IBB Berlin",BB:"ILB Brandenburg",HB:"Bremer Aufbau-Bank",HH:"IFB Hamburg",HE:"WIBank Hessen",MV:"LFI M-V",NI:"NBank Niedersachsen",NW:"NRW.BANK",RP:"ISB Rheinland-Pfalz",SL:"SIKB Saarland",SN:"SAB Sachsen",ST:"IB Sachsen-Anhalt",SH:"IB.SH",TH:"TAB Thüringen"};

function TierSel({value,onChange,tiers}){
  const{t}=useApp();
  const opts=[{k:"s",l:t.tierS||"Standard",c:"var(--ch)"},{k:"g",l:t.tierG||"Gehoben",c:"var(--ca)"},{k:"m",l:t.tierM||"Premium",c:"#b8860b"}];
  return <div style={{display:"flex",gap:0,borderRadius:6,overflow:"hidden",border:"1px solid var(--cb)",marginBottom:6}}>
    {opts.map(o=><button key={o.k} onClick={()=>onChange(o.k)} style={{flex:1,padding:"6px 2px",border:"none",fontSize:10,fontWeight:value===o.k?600:400,cursor:"pointer",background:value===o.k?"var(--ca)":"var(--ci)",color:value===o.k?"#fff":"var(--ch)",fontFamily:"inherit",lineHeight:1.2}}>
      <div>{o.l}</div>
      {tiers[o.k]&&<div style={{fontSize:9,marginTop:1,opacity:value===o.k?1:.7}}>{fmtE(tiers[o.k].p)}</div>}
    </button>)}
  </div>;
}

function Sanier(){
  const{d,set,t,tip}=useApp();
  const[view,setView]=useState("input");
  const[act,setAct]=useState({fenster:false,fassade:false,heizung:false,dach:false,tuer:false,pv:false,keller:false,ogdecke:false,batterie:false,lueftung:false});
  const[tier,setTier]=useState({fenster:"s",fassade:"s",heizung:"s",dach:"s",tuer:"s",pv:"s",lueftung:"s"});
  const[s,setS]=useState({fA:"12",fXL:"0",fHST:"0",faF:"137",anbau:"frei",daF:"80",dachform:"sattel",pvK:"7",keF:"60",ogF:"60",batK:"7",epStrom:"0.35",epHeiz:"0.12",hkJahr:"",skJahr:"",preisstieg:"2"});
  const sF=(k,v)=>setS(p=>({...p,[k]:v}));
  const tog=k=>setAct(p=>({...p,[k]:!p[k]}));
  const setT=(k,v)=>setTier(p=>({...p,[k]:v}));

  const R=useMemo(()=>{
    const fl=+d.sanFl||+d.flaeche||140,bj=+d.sanBj||1981,ht=d.sanHt||"heizoel",ha=d.sanHa||"alt",pe=+d.sanPe||3;
    const hk=bj<1945?220:bj<1970?180:bj<1985?150:bj<2000?120:bj<2010?80:50;
    const co2F={wp:.07,pellets:.02,"fernw-std":.18,kohle:.34,heizoel:.266,strom:.434,gas:.202}[ht]||.2;
    const ep={wp:.04,pellets:.07,"fernw-std":.12,kohle:.09,heizoel:.12,strom:.31,gas:.13}[ht]||.12;
    const eH=Math.round(hk*fl)+Math.round(pe*800)+Math.round(fl*8);
    const co2H=Math.round(eH*co2F);
    const epStrom=+s.epStrom||0.35,epHeiz=+s.epHeiz||0.12;
    const htIsStrom=ht==="wp"||ht==="strom";
    const epKwh=htIsStrom?epStrom:epHeiz;
    // Jahreskosten: user-eingabe überschreibt Auto-Kalkulation (muss VOR kH/skJ stehen)
    const hkJahrUser=+s.hkJahr||0,skJahrUser=+s.skJahr||0;
    const preisstieg=(+s.preisstieg||2)/100; // %/Jahr Energiepreis-Steigerung
    const kH_auto=Math.round(eH*ep/50)*50;
    const kH=hkJahrUser>0?hkJahrUser:kH_auto; // User-Eingabe hat Vorrang
    const sk_auto=Math.round(fl*epStrom*150/50)*50;  // ~150 kWh/m² Stromverbrauch
    const skJ=skJahrUser>0?skJahrUser:sk_auto;

    const anbauF=s.anbau==="doppel"?0.75:s.anbau==="mittel"?0.5:1;
    const oF=(ht==="heizoel"||ht==="gas"||ht==="kohle")&&ha==="alt";
    const hFQ=Math.min(.30+(oF?.20:.00),.70); // BAFA BEG 2026: 30% Grund + 20% Klimabonus (alte Öl/Gas/Kohle), kein +5% für andere

    const FQ={fenster:.15,fassade:.15,heizung:hFQ,dach:.15,tuer:.15,pv:0,keller:.15,ogdecke:.15,batterie:0,lueftung:.15};
    // BAFA/KfW Förder-Caps 2026 (max. Förderung pro Maßnahme, BEG EM Merkblatt, ohne iSFP-Bonus)
    const FO_CAP={
      fenster:Math.round(30000*.15),   // 30.000€ × 15% = 4.500€ max
      fassade:Math.round(30000*.15),   // 30.000€ × 15% = 4.500€ max
      heizung:Math.round(30000*hFQ),   // 30.000€ × hFQ (EFH Einzelmaßnahme)
      dach:Math.round(30000*.15),      // 30.000€ × 15% = 4.500€ max
      tuer:Math.round(30000*.15),      // 30.000€ × 15% = 4.500€ max
      pv:Infinity,                     // KfW 270: kein Betragscap
      keller:Math.round(30000*.15),    // 30.000€ × 15% = 4.500€ max
      ogdecke:Math.round(30000*.15),   // 30.000€ × 15% = 4.500€ max
      batterie:Infinity,               // Landesförderung: variiert
      lueftung:Math.round(30000*.15)   // 30.000€ × 15% = 4.500€ max
    };
    const ES={
      fenster:{ek:.12,co2:.10},fassade:{ek:.20,co2:.18},heizung:{ek:.35,co2:.45},
      dach:{ek:.08,co2:.07},tuer:{ek:.02,co2:.02},
      pv:{ek:Math.min((+s.pvK||7)*950*ep/Math.max(kH,1),.25),co2:Math.min((+s.pvK||7)*950*.434/Math.max(co2H,1),.20)},
      keller:{ek:.05,co2:.04},ogdecke:{ek:.06,co2:.05},
      batterie:{ek:.05,co2:.03},lueftung:{ek:.08,co2:.06}
    };

    const fA=+s.fA||12,fXL=+s.fXL||0,fHST=+s.fHST||0;
    const tF=tier.fenster,tFa=tier.fassade,tH=tier.heizung,tD=tier.dach,tT=tier.tuer,tP=tier.pv,tL=tier.lueftung;
    const fenK=fA*SAN_TIERS.fenster[tF].p+fXL*(SAN_TIERS.fensterXL[tF]?.p||2000)+fHST*(SAN_TIERS.fensterHST[tF]?.p||5000);
    const faF2=+s.faF||137,fasK=Math.round(SAN_TIERS.fassade[tFa].p*anbauF*Math.max(faF2,40)/137);
    const hzK=SAN_TIERS.heizung[tH].p;
    const daF2=+s.daF||80,daK=Math.round(SAN_TIERS.dach[tD].p*Math.max(daF2,30)/80);
    const tuerK=SAN_TIERS.tuer[tT].p;
    const pvK2=+s.pvK||7,pvKo=Math.round(SAN_TIERS.pv[tP].p*pvK2/7);
    const keF2=+s.keF||60,kelK=Math.round(keF2*37);
    const ogF2=+s.ogF||60,ogK=Math.round(ogF2*35);
    const batK2=+s.batK||7,batKo=Math.round(batK2*1000);
    const lueK=SAN_TIERS.lueftung[tL].p;

    const ALL=[
      {k:"fenster",n:t.sanMassN1,c:fenK,em:"🪟",det:`${fA} Std.${fXL>0?", "+fXL+" XL":""}${fHST>0?", "+fHST+" HST":""}`,src:SAN_SRC_KEYS.fenster},
      {k:"fassade",n:t.sanMassN2,c:fasK,em:"🧱",det:`${faF2}m² · ${s.anbau==="doppel"?t.anbDoppel:s.anbau==="mittel"?t.anbMittel:t.anbFrei} · ${SAN_TIERS.fassade[tFa].d}cm`,src:SAN_SRC_KEYS.fassade},
      {k:"heizung",n:t.sanMassN3,c:hzK,em:"🔥",det:t[SAN_TIERS.heizung[tH].l]||SAN_TIERS.heizung[tH].l,src:SAN_SRC_KEYS.heizung},
      {k:"dach",n:t.sanMassN4,c:daK,em:"🏠",det:`${daF2}m² · ${s.dachform==="flach"?t.dchFlach:s.dachform==="walm"?t.dchWalm:t.dchSattel}`,src:SAN_SRC_KEYS.dach},
      {k:"tuer",n:t.sanMassN5,c:tuerK,em:"🚪",det:t[SAN_TIERS.tuer[tT].l]||SAN_TIERS.tuer[tT].l,src:SAN_SRC_KEYS.tuer},
      {k:"pv",n:t.sanMassN6,c:pvKo,em:"☀️",det:`${pvK2} kWp · ${t[SAN_TIERS.pv[tP].l]||SAN_TIERS.pv[tP].l}`,src:SAN_SRC_KEYS.pv},
      {k:"keller",n:t.sanMassN7,c:kelK,em:"🏗️",det:`${keF2}m²`,src:SAN_SRC_KEYS.keller},
      {k:"ogdecke",n:t.sanMassN8,c:ogK,em:"🔝",det:`${ogF2}m²`,src:SAN_SRC_KEYS.ogdecke},
      {k:"batterie",n:t.sanMassN9,c:batKo,em:"🔋",det:`${batK2} kWh`,src:SAN_SRC_KEYS.batterie},
      {k:"lueftung",n:t.sanMassN10,c:lueK,em:"💨",det:t[SAN_TIERS.lueftung[tL].l]||SAN_TIERS.lueftung[tL].l,src:SAN_SRC_KEYS.lueftung}
    ];

    let tK=0,tFo=0,eM=1,cM=1;
    const rows=[];
    ALL.forEach(m=>{
      if(!act[m.k])return;
      const fq=FQ[m.k]||0;
      const foRaw=Math.round(m.c*fq/100)*100;
      const fo=Math.min(foRaw,FO_CAP[m.k]??foRaw);  // BAFA/KfW Cap anwenden
      tK+=m.c;tFo+=fo;
      const ekE=Math.round(kH*(ES[m.k]?.ek||0)/50)*50;
      const co2E=Math.round(co2H*(ES[m.k]?.co2||0));
      eM*=(1-(ES[m.k]?.ek||0));
      cM*=(1-(ES[m.k]?.co2||0));
      const capped=foRaw>fo;
      rows.push({n:m.n,em:m.em,c:m.c,f:fo,net:m.c-fo,ek:ekE,co2:co2E,src:m.src,fq:Math.round(fq*100),det:m.det,k:m.k,capped});
    });
    const ne=tK-tFo;
    const ekG=Math.round(kH*(1-eM)/50)*50;
    const co2G=Math.round(co2H*(1-cM));
    const espEuro=Math.round(ekG*epKwh);
    // Amortisation mit optionaler Preissteigerungs-Prognose
    let amJ=99;
    if(espEuro>0&&ne>0){
      if(preisstieg<=0){
        amJ=Math.round(ne/espEuro*10)/10;
      } else {
        // Geometrische Reihe: ne = espEuro * ((1+p)^n - 1) / p
        let kum=0,yr=0;
        while(kum<ne&&yr<80){yr++;kum+=espEuro*Math.pow(1+preisstieg,yr-1);}
        amJ=yr<80?yr:99;
      }
    }

    const gegReq=[];
    if(bj<2002&&ha==="alt"&&(ht==="heizoel"||ht==="gas"))gegReq.push({law:"§ 72 GEG",text:t.sanTip4,sev:"warn"});
    if(bj<1984)gegReq.push({law:"§ 47 GEG",text:t.sanMassN8+" — "+t.sHTyp,sev:"info"});
    if(bj<1978)gegReq.push({law:"§ 71 GEG",text:t.sanMassN3+": 65% "+t.str,sev:"info"});
    if(hk>200)gegReq.push({law:"EU-EPBD",text:`${t.eKl} ${EC_O[kw2ec(hk)]} (${hk} kWh/m²a)`,sev:"warn"});

    return{tK,tFo,ne,ekG,co2G,amJ,ecV:kw2ec(hk),ecN:kw2ec(Math.max(hk*eM,10)),hk,eM,cM,kH,skJ,co2H,ALL,rows,epKwh,htIsStrom,espEuro,gegReq,preisstieg};
  },[d,s,act,tier,t]);

  const htO=[{v:"gas",l:t.gas},{v:"heizoel",l:t.oel},{v:"wp",l:t.wp},{v:"pellets",l:t.pel},{v:"fernw-std",l:t.fw},{v:"kohle",l:t.koh},{v:"strom",l:t.str}];
  const haO=[{v:"alt",l:t.alt},{v:"mittel",l:t.mitt},{v:"neu",l:t.neu}];
  const anbauO=[{v:"frei",l:t.anbFrei},{v:"doppel",l:t.anbDoppel},{v:"mittel",l:t.anbMittel}];
  const dachO=[{v:"sattel",l:t.dchSattel},{v:"flach",l:t.dchFlach},{v:"walm",l:t.dchWalm}];
  const hasTier=k=>["fenster","fassade","heizung","dach","tuer","pv","lueftung"].includes(k);

  return <div><VT view={view} setView={setView}/><div className="split">
    <div className={`inp-pane ${view==="input"?"act":""}`}>
      <Sec title={t.oL} icon="📍"/>
      <Sel label={t.bundesland} value={d.bundesland} onChange={v=>set("bundesland",v)} options={BL_O}/>
      <PLZSearch showKapp={false}/>
      <Sec title={t.sGebData} icon="🏠"/>
      <Row><F label={t.sWfl} unit="m²" value={d.sanFl||d.flaeche||"140"} onChange={v=>set("sanFl",v)} tip={tip("flaeche")}/><F label={t.sBJ} value={d.sanBj||"1981"} onChange={v=>set("sanBj",v)} tip={tip("bj")}/></Row>
      <Row><Sel label={t.sHTyp} value={d.sanHt||"heizoel"} onChange={v=>set("sanHt",v)} options={htO}/><Sel label={t.sHAlt} value={d.sanHa||"alt"} onChange={v=>set("sanHa",v)} options={haO}/></Row>
      <F label={t.sPers} value={d.sanPe||"3"} onChange={v=>set("sanPe",v)} tip={tip("pers")}/>
      <Sec title={t.sEnergie} icon="⚡"/>
      <Row><F label={t.sStrPr} unit="€/kWh" value={s.epStrom} onChange={v=>sF("epStrom",v)} step="0.01" tip={tip("epStrom")}/><F label={t.sHkos} unit="€/kWh" value={s.epHeiz} onChange={v=>sF("epHeiz",v)} step="0.01" tip={tip("epHeiz")}/></Row>
      <Row><F label={t.sHkJahr} unit="€/J." value={s.hkJahr} onChange={v=>sF("hkJahr",v)} tip={tip("hkJahr")} placeholder={t.sAutoCalc}/><F label={t.sSkJahr} unit="€/J." value={s.skJahr} onChange={v=>sF("skJahr",v)} tip={tip("skJahr")} placeholder={t.sAutoCalc}/></Row>
      <Sel label={t.sPreisstieg} value={s.preisstieg||"2"} onChange={v=>sF("preisstieg",v)} options={[{v:"0",l:t.sPS0},{v:"1",l:t.sPS1},{v:"2",l:t.sPS2},{v:"3",l:t.sPS3},{v:"5",l:t.sPS5}]}/>

      <Sec title={t.sStruktur} icon="📐"/>
      <Row><Sel label={t.sAnbau} value={s.anbau} onChange={v=>sF("anbau",v)} options={anbauO}/><Sel label={t.sDaForm} value={s.dachform} onChange={v=>sF("dachform",v)} options={dachO}/></Row>

      <Sec title={t.sMassnahmen} icon="🔧"/>
      {R.ALL.map(m=><div key={m.k} style={{marginBottom:8,border:act[m.k]?"2px solid var(--ca)":"1px solid var(--cb)",borderRadius:10,overflow:"visible",background:act[m.k]?"var(--cc)":"transparent",transition:"border .2s"}}>
        <div onClick={()=>tog(m.k)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",cursor:"pointer"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>{m.em}</span>
            <div><div style={{fontSize:12,fontWeight:600}}>{m.n}</div>
              {act[m.k]&&<div style={{fontSize:10,color:"var(--ch)",marginTop:1}}>{m.det}</div>}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:12,fontWeight:600,color:act[m.k]?"var(--ca)":"var(--ch)"}}>{fmtE(m.c)}</span>
            <div style={{width:18,height:18,borderRadius:5,background:act[m.k]?"var(--ca)":"var(--cb)",display:"flex",alignItems:"center",justifyContent:"center",transition:"background .2s"}}>{act[m.k]&&<span style={{color:"#fff",fontSize:11}}>✓</span>}</div>
          </div>
        </div>
        {act[m.k]&&<div style={{padding:"0 12px 10px",borderTop:"1px solid var(--cb)"}}>
          {hasTier(m.k)&&<div style={{marginTop:8}}><TierSel value={tier[m.k]} onChange={v=>setT(m.k,v)} tiers={SAN_TIERS[m.k]}/></div>}

          {m.k==="fenster"&&<div style={{marginTop:4}}>
            <Row><F label={t.sFenStd} value={s.fA} onChange={v=>sF("fA",v)}/><F label={t.sFenXL} value={s.fXL} onChange={v=>sF("fXL",v)}/></Row>
            <F label={t.sFenHST} value={s.fHST} onChange={v=>sF("fHST",v)}/>
          </div>}
          {m.k==="fassade"&&<F label={t.sFasFl} unit="m²" value={s.faF} onChange={v=>sF("faF",v)} tip={tip("fasFl")}/>}
          {m.k==="dach"&&<F label={t.sDaFl} unit="m²" value={s.daF} onChange={v=>sF("daF",v)} tip={tip("daFl")}/>}
          {m.k==="pv"&&<F label={t.sLeist} unit="kWp" value={s.pvK} onChange={v=>sF("pvK",v)} step="0.5" tip={tip("pvLeistung")}/>}
          {m.k==="keller"&&<F label={t.sKeFl} unit="m²" value={s.keF} onChange={v=>sF("keF",v)} tip={tip("keFl")}/>}
          {m.k==="ogdecke"&&<F label={t.sOgFl} unit="m²" value={s.ogF} onChange={v=>sF("ogF",v)} tip={tip("ogdecke")}/>}
          {m.k==="batterie"&&<F label={t.sKap} unit="kWh" value={s.batK} onChange={v=>sF("batK",v)} tip={tip("batterie")}/>}

          <div style={{fontSize:10,color:"var(--ch)",marginTop:4,display:"flex",alignItems:"center",gap:6}}>
          <span>📚 {t[m.src]||m.src}</span>
          {m.capped&&<span style={{background:"#FFF8E6",color:"#8a6d10",borderRadius:4,padding:"1px 5px",fontSize:9,fontWeight:600,border:"1px solid #F5E4A8"}}>⚠ Cap</span>}
        </div>
        </div>}
      </div>)}
      <button className="mob-next-btn" onClick={()=>{setView("result");setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),50)}}>{t.ergebnis} →</button>
    </div>

    <div className={`res-pane ${view==="result"?"act":""}`}>

      <div style={{background:"linear-gradient(135deg,var(--ca),var(--ca-dk))",borderRadius:14,padding:"18px 16px",color:"#fff",marginBottom:14}}>
        <div style={{fontSize:10,opacity:.8,textTransform:"uppercase"}}>{t.sGesK}</div>
        <div style={{fontSize:26,fontWeight:700,marginTop:4}}>{R.rows.length>0?fmtE(R.tK):"— €"}</div>
        {R.rows.length>0?<div style={{display:"flex",gap:20,marginTop:12}}>
          <div><div style={{fontSize:9,opacity:.6}}>{t.foe}</div><div style={{fontSize:14,fontWeight:600}}>–{fmtE(R.tFo)}</div></div>
          <div><div style={{fontSize:9,opacity:.6}}>{t.sNetK}</div><div style={{fontSize:14,fontWeight:600}}>{fmtE(R.ne)}</div></div>
          <div><div style={{fontSize:9,opacity:.6}}>{t.amo}</div><div style={{fontSize:14,fontWeight:600}}>{R.amJ>30?"> 30 J.":`${R.amJ} J.`}</div></div>
        </div>:<div style={{fontSize:12,opacity:.75,marginTop:10}}>👈 {t.sMassnahmen}</div>}
      </div>

      {d.bundesland&&R.rows.length>0&&<div style={{padding:"8px 12px",background:"var(--ci)",borderRadius:8,fontSize:11,marginBottom:12,color:"var(--ch)",border:"1px solid var(--cb)"}}>
        🏛️ {t.foe} (BAFA/KfW) · {t.check}: <b style={{color:"var(--ct)"}}>{landF[d.bundesland]||"BEG"}</b>
      </div>}

      {R.gegReq.length>0&&<div style={{background:"#FFF8E6",borderRadius:10,padding:"12px",border:"1px solid #F5E4A8",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:600,color:"#8a6d10",marginBottom:6}}>⚖️ {t.mR} — GEG</div>
        {R.gegReq.map((g,i)=><div key={i} style={{display:"flex",gap:6,marginBottom:4,fontSize:11}}>
          <span style={{flexShrink:0}}>{g.sev==="warn"?"⚠️":"ℹ️"}</span>
          <span style={{color:"#6b5a10"}}><b>{g.law}:</b> {g.text}</span>
        </div>)}
      </div>}

      {R.rows.length>0&&<>

      {R.rows.length>0&&<div style={{background:"var(--cc)",borderRadius:12,padding:"12px",border:"1px solid var(--cb)",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>{t.sMassDet}</div>
        {R.rows.map((r,i)=><div key={i} style={{borderBottom:i<R.rows.length-1?"1px solid var(--cb)":"none",padding:"10px 0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <span style={{fontSize:14}}>{r.em}</span>
              <div><div style={{fontSize:12,fontWeight:600}}>{r.n}</div><div style={{fontSize:10,color:"var(--ch)"}}>{r.det}</div></div>
            </div>
            <div style={{textAlign:"right"}}><div style={{fontSize:12,fontWeight:600}}>{fmtE(r.c)}</div></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,fontSize:10,marginTop:4}}>
            <div style={{background:"var(--ci)",borderRadius:4,padding:"4px 6px"}}><div style={{color:"var(--ch)"}}>{t.foe} ({r.fq}%)</div><div style={{color:"#22c55e",fontWeight:500}}>–{fmtE(r.f)}</div></div>
            <div style={{background:"var(--ci)",borderRadius:4,padding:"4px 6px"}}><div style={{color:"var(--ch)"}}>{t.esp}</div><div style={{fontWeight:500}}>{fmtE(r.ek)}/J.</div></div>
            <div style={{background:"var(--ci)",borderRadius:4,padding:"4px 6px"}}><div style={{color:"var(--ch)"}}>{t.co2}</div><div style={{fontWeight:500}}>–{fmt(r.co2)} kg/J.</div></div>
          </div>
          <div style={{fontSize:9,color:"var(--ch)",marginTop:4}}>📚 {t[r.src]||r.src} · {t.sNetK}: {fmtE(r.net)}</div>
        </div>)}
        <div style={{paddingTop:8,borderTop:"2px solid var(--ct)",display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:600}}>
          <span>{t.sGesamt}</span><span>{fmtE(R.tK)} – {fmtE(R.tFo)} = <span style={{color:"var(--ca)"}}>{fmtE(R.ne)}</span></span>
        </div>
      </div>}

      <div style={{background:"var(--cc)",borderRadius:12,padding:"14px",border:"1px solid var(--cb)",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:600,marginBottom:10}}>{t.eKl}</div>
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:16}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:"var(--ch)",marginBottom:4}}>{t.vor}</div>
            <div style={{fontSize:18,fontWeight:700,color:"#fff",background:EC_C[R.ecV],borderRadius:8,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>{EC_O[R.ecV]}</div>
            <div style={{fontSize:10,color:"var(--ch)",marginTop:4}}>{fmt(R.hk)} kWh/m²a</div>
          </div>
          <div style={{fontSize:26,color:"var(--ca)",fontWeight:600,lineHeight:1}}>→</div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:10,color:"var(--ch)",marginBottom:4}}>{t.nac}</div>
            <div style={{fontSize:18,fontWeight:700,color:"#fff",background:EC_C[R.ecN],borderRadius:8,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto"}}>{EC_O[R.ecN]}</div>
            <div style={{fontSize:10,color:"var(--ch)",marginTop:4}}>{fmt(Math.round(R.hk*R.eM))} kWh/m²a</div>
          </div>
        </div>
      </div>

      <div className="if-row" style={{marginBottom:14}}>
        <KPI label={t.sEnerEsp} value={`-${Math.round((1-R.eM)*100)}%`} sub={`${fmtE(R.kH)} → ${fmtE(Math.round(R.kH*R.eM/50)*50)}/J.`} accent/>
        <KPI label={t.sCO2R} value={`-${Math.round((1-R.cM)*100)}%`} sub={`${fmt(R.co2H)} → ${fmt(Math.round(R.co2H*R.cM))} kg/J.`}/>
        <KPI label={t.sJEsp} value={fmtE(R.espEuro)} sub={`bei ${fmt(R.epKwh,2)} €/kWh (${R.htIsStrom?t.str:t.sHTyp})`} accent/>
        <KPI label={t.sFqAvg} value={R.tK>0?fmtP(R.tFo/R.tK*100):"—"} sub={`${fmtE(R.tFo)} ${t.foe}`}/>
      </div>

      <div className="if-row" style={{marginBottom:14}}>
        <KPI label={t.sHkJahr} value={fmtE(R.kH)} sub={t.sAutoCalc} accent/>
        <KPI label={t.sSkJahr} value={fmtE(R.skJ)} sub={t.sAutoCalc}/>
      </div>

      <div style={{background:"var(--cc)",borderRadius:12,padding:"12px",border:"1px solid var(--cb)",marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:11,fontWeight:600}}>{t.sAmoR}</span>
          {R.preisstieg>0&&<span style={{fontSize:9,color:"var(--ch)",background:"var(--ci)",padding:"2px 6px",borderRadius:4,border:"1px solid var(--cb)"}}>+{Math.round(R.preisstieg*100)}%/J. {t.sPreisstieg}</span>}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <span style={{fontSize:18,fontWeight:700,color:"var(--ct)"}}>{R.amJ>30?"> 30 J.":`${R.amJ} J.`}</span>
          <span style={{fontSize:11,color:"var(--ch)"}}>{t.sAmoSub}</span>
        </div>
        <div style={{height:6,borderRadius:3,background:"var(--cb)",overflow:"hidden"}}>
          <div style={{height:"100%",width:`${Math.min(R.amJ/30*100,100)}%`,borderRadius:3,background:R.amJ<=10?"#22c55e":R.amJ<=20?"var(--ca)":"#f59e0b"}}/>
        </div>
        <div style={{fontSize:10,color:"var(--ch)",marginTop:6,lineHeight:1.6}}>
          {t.sNetK}: {fmtE(R.ne)} ÷ {t.sJEsp}: {fmtE(R.espEuro)}/J. = <b>{R.amJ>30?"> 30":R.amJ} J.</b>
        </div>
      </div>

      <div style={{marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:600,marginBottom:8}}>💡 {t.sBerat}</div>
        <Ins emoji="🔄" text={t.sanTip1} type="info"/>
        <Ins emoji="👨‍🔧" text={t.sanTip2} type="info"/>
        <Ins emoji="📝" text={t.sanTip3} type="warn"/>
        {(+d.sanBj||1981)<1977&&<Ins emoji="⚠️" text={`${t.sBJ} ${d.sanBj||1981}: GEG § 47`} type="warn"/>}
        {d.sanHa==="alt"&&(d.sanHt==="heizoel"||d.sanHt==="gas"||d.sanHt==="kohle")&&<Ins emoji="🔥" text={t.sanTip4} type="bad"/>}
        <Ins emoji="💸" text={t.sanTip5} type="good"/>
        <Ins emoji="🌡️" text={t.sanTip6} type="info"/>
        {d.bundesland&&<Ins emoji="🏛️" text={`${t.foe}: ${landF[d.bundesland]||"BEG"}`} type="info"/>}
        {act.pv&&act.batterie&&<Ins emoji="🔋" text={t.sanTip7} type="good"/>}
        {R.amJ>25&&R.rows.length>0&&<Ins emoji="🧮" text={`${t.amo}: ${R.amJ>30?">30":R.amJ} J.`} type="info"/>}
        {R.amJ>20&&R.rows.length>0&&<Ins emoji="🏦" text={t.adv16} type="info"/>}
        {R.ecN!==undefined&&R.ecN>3&&<Ins emoji="🇪🇺" text={t.adv17} type="warn"/>}
        {act&&act.heizung&&!act.fassade&&!act.dach&&<Ins emoji="🌡️" text={t.adv18} type="warn"/>}
      </div>
      <ExportPDF title={t.sanier}/>
        <Legal items={LEG.sanier}/>
      </>}
    </div>
  </div></div>;
}

// ═══ APP ═══
const IC={
  haupt:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  kredit:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>,
  miete:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  sanier:a=><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={a?"var(--ca)":"var(--ch)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>
};

// ═══════════ LANDING PAGE ═══════════
function Landing({onStart,zinsen,openDatenschutz,openImpressum,lang,setLang}){
  const l=TL[lang]||TL.de;
  const zD=zinsen&&zinsen.datum?zinsen.datum:null;
  const zB=zinsen?.bundesanleihe_10j;
  const [tipOpen,setTipOpen]=useState(false);
  const [navOpen,setNavOpen]=useState(false);

  const scrollTo=(id)=>{const el=document.getElementById(id);if(el){const y=el.getBoundingClientRect().top+window.scrollY-80;window.scrollTo({top:y,behavior:"smooth"});setNavOpen(false)}};

  return <div style={{minHeight:"100dvh",background:"var(--bg)",fontFamily:"'DM Sans',sans-serif",display:"flex",flexDirection:"column",paddingTop:"calc(80px + env(safe-area-inset-top))"}}>


    {/* ═══════════ STICKY HEADER WITH NAV + CTA ═══════════ */}
    <header style={{position:"fixed",top:0,left:0,right:0,zIndex:50,background:"rgba(245,245,240,.92)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderBottom:"1px solid var(--cb)",paddingTop:"env(safe-area-inset-top)"}}>
      <div style={{maxWidth:1280,margin:"0 auto",padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:24}}>

        {/* Logo */}
        <button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} style={{display:"flex",alignItems:"center",gap:14,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"inherit"}}>
          <img src="/icon-192.png" alt="Immofuchs" style={{width:52,height:52,objectFit:"contain",flexShrink:0,borderRadius:10}}/>
          <div style={{fontSize:23,fontWeight:800,letterSpacing:-.5,lineHeight:1,color:"var(--ct)"}}>immo<span style={{color:"var(--ca)"}}>fuchs</span><span style={{color:"var(--ct)",fontWeight:700}}>.info</span></div>
        </button>

        {/* Desktop Nav */}
        <nav className="lp-nav" style={{display:"flex",alignItems:"center",gap:28}}>
          <button onClick={()=>scrollTo("rechner")} style={navLink}>{l.navRechner}</button>
          <button onClick={()=>scrollTo("funktioniert")} style={navLink}>{l.navHow}</button>
          <button onClick={()=>scrollTo("zinsen")} style={navLink}>{l.navZinsen}</button>
        </nav>

        {/* Right side: lang + CTA */}
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <LangSel lang={lang} setLang={setLang}/>
          <button onClick={()=>scrollTo("rechner")} className="lp-cta" style={{padding:"10px 18px",background:"var(--ca)",color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 12px rgba(232,96,10,.25)",letterSpacing:.2,whiteSpace:"nowrap"}}>{l.heroCtaPrimary}</button>
          {/* Mobile nav toggle */}
          <button onClick={()=>setNavOpen(o=>!o)} className="lp-burger" style={{display:"none",width:40,height:40,padding:0,background:"none",border:"1px solid var(--cb)",borderRadius:8,cursor:"pointer",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:18}}>☰</span>
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {navOpen&&<div className="lp-nav-mobile" style={{borderTop:"1px solid var(--cb)",padding:"12px 24px 18px",display:"flex",flexDirection:"column",gap:4,background:"var(--cc)"}}>
        <button onClick={()=>scrollTo("rechner")} style={navLinkMobile}>{l.navRechner}</button>
        <button onClick={()=>scrollTo("funktioniert")} style={navLinkMobile}>{l.navHow}</button>
        <button onClick={()=>scrollTo("zinsen")} style={navLinkMobile}>{l.navZinsen}</button>
      </div>}
    </header>

    {/* ═══════════ HERO ═══════════ */}
    <section style={{maxWidth:1280,margin:"0 auto",padding:"clamp(32px,6vw,80px) 16px clamp(32px,5vw,60px)",width:"100%",boxSizing:"border-box"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,360px),1fr))",gap:"clamp(28px,5vw,48px)",alignItems:"center",justifyItems:"center"}}>

        {/* LEFT: Headline + CTAs */}
        <div style={{width:"100%"}}>
          {/* Above-headline tag */}
          <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",background:"var(--ca-bg)",border:"1px solid var(--ca-bd)",borderRadius:30,fontSize:12,color:"var(--ca-dk)",fontWeight:600,marginBottom:20,letterSpacing:.3}}>
            {l.tagFull}
          </div>

          <h1 style={{fontSize:"clamp(34px,5vw,56px)",fontWeight:800,color:"var(--ct)",letterSpacing:-1,lineHeight:1.05,margin:"0 0 18px"}}>
            {l.h1a}<span style={{color:"var(--ca)"}}>{l.h1b}</span>{l.h1c}
          </h1>

          <p style={{fontSize:"clamp(16px,1.6vw,19px)",color:"var(--ch)",lineHeight:1.55,margin:"0 0 28px",maxWidth:540}}>{l.subShort}</p>

          {/* CTAs */}
          <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:28}}>
            <button onClick={()=>scrollTo("rechner")} style={{padding:"14px 26px",background:"var(--ca)",color:"#fff",border:"none",borderRadius:11,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 8px 20px rgba(232,96,10,.28)",letterSpacing:.2,display:"inline-flex",alignItems:"center",gap:8}}>{l.heroCtaPrimary} <span style={{fontSize:18,marginTop:-2}}>→</span></button>
            <button onClick={()=>scrollTo("funktioniert")} style={{padding:"14px 24px",background:"var(--cc)",color:"var(--ct)",border:"1.5px solid var(--cb)",borderRadius:11,fontSize:15,fontWeight:600,cursor:"pointer",fontFamily:"inherit",letterSpacing:.2}}>{l.heroCtaSecondary}</button>
          </div>

          {/* Trust elements */}
          <div style={{display:"flex",flexWrap:"wrap",gap:"10px 24px",fontSize:13,color:"var(--ch)"}}>
            {[
              {ic:"✓",t:l.trust1},
              {ic:"✓",t:l.trust2},
              {ic:"✓",t:l.trust3},
              {ic:"✓",t:l.trust4}
            ].map((tr,i)=><div key={i} style={{display:"inline-flex",alignItems:"center",gap:6}}>
              <span style={{width:18,height:18,borderRadius:"50%",background:"#22c55e",color:"#fff",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,flexShrink:0}}>{tr.ic}</span>
              <span style={{fontWeight:500,color:"var(--cl)"}}>{tr.t}</span>
            </div>)}
          </div>
        </div>

        {/* RIGHT: Browser Mockup (larger, more polished) */}
        <div style={{position:"relative",width:"100%",maxWidth:"100%",overflow:"hidden"}}>

          <div style={{background:"#1a1a1a",borderRadius:"14px 14px 0 0",padding:"12px 16px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 30px 60px -10px rgba(0,0,0,.18)"}}>
            <div style={{display:"flex",gap:7}}>
              <div style={{width:12,height:12,borderRadius:"50%",background:"#ff5f56"}}/>
              <div style={{width:12,height:12,borderRadius:"50%",background:"#ffbd2e"}}/>
              <div style={{width:12,height:12,borderRadius:"50%",background:"#27c93f"}}/>
            </div>
            <div style={{flex:1,background:"#2a2a2a",borderRadius:7,padding:"5px 14px",fontSize:12,color:"#aaa",textAlign:"center",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <span style={{color:"#27c93f",fontSize:10}}>🔒</span> immofuchs.info
            </div>
          </div>
          <div style={{background:"var(--cc)",borderRadius:"0 0 14px 14px",padding:"20px",boxShadow:"0 30px 60px -10px rgba(0,0,0,.18)",border:"1px solid var(--cb)",borderTop:"none"}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,180px),1fr))",gap:14}}>
              <div style={{display:"flex",flexDirection:"column",gap:11}}>
                <div><div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--ch)",marginBottom:3,fontWeight:600}}>{l.mockKauf}</div><div style={{padding:"9px 12px",border:"1px solid var(--cb)",borderRadius:7,fontSize:14,fontWeight:600,background:"var(--ci)"}}>350.000 €</div></div>
                <div><div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--ch)",marginBottom:3,fontWeight:600}}>{l.mockMiete}</div><div style={{padding:"9px 12px",border:"1px solid var(--cb)",borderRadius:7,fontSize:14,fontWeight:600,background:"var(--ci)"}}>1.200 €</div></div>
                <div><div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--ch)",marginBottom:3,fontWeight:600}}>{l.mockZins}</div><div style={{padding:"9px 12px",border:"1px solid var(--cb)",borderRadius:7,fontSize:14,fontWeight:600,background:"var(--ci)"}}>{(zinsen?.avg||MARKET_RATES.avg)} % p.a.</div></div>
                <div><div style={{fontSize:9,letterSpacing:1,textTransform:"uppercase",color:"var(--ch)",marginBottom:3,fontWeight:600}}>{l.mockEK}</div><div style={{padding:"9px 12px",border:"1px solid var(--cb)",borderRadius:7,fontSize:14,fontWeight:600,background:"var(--ci)"}}>70.000 €</div></div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{padding:"10px 11px",background:"var(--ca-bg)",border:"1px solid var(--ca-bd)",borderRadius:8}}>
                    <div style={{fontSize:9,letterSpacing:.8,textTransform:"uppercase",color:"var(--ca)",fontWeight:700}}>{l.mockBrutto}</div>
                    <div style={{fontSize:18,fontWeight:700,color:"var(--ca)",marginTop:3}}>4,11 %</div>
                  </div>
                  <div style={{padding:"10px 11px",background:"#e7f7ee",border:"1px solid #b7e4c7",borderRadius:8}}>
                    <div style={{fontSize:9,letterSpacing:.8,textTransform:"uppercase",color:"#1a7f3e",fontWeight:700}}>{l.mockNetto}</div>
                    <div style={{fontSize:18,fontWeight:700,color:"#1a7f3e",marginTop:3}}>2,98 %</div>
                  </div>
                </div>
                <div style={{padding:"10px 12px",border:"1px solid var(--cb)",borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontSize:11,color:"var(--cl)",fontWeight:600}}>{l.mockRate}</div><div style={{fontSize:9,color:"var(--ch)"}}>{l.mockRateSub}</div></div>
                  <div style={{fontSize:16,fontWeight:700,color:"#1d6af5"}}>1.154 €</div>
                </div>
                <div style={{padding:"10px 12px",background:"#e7f7ee",border:"1px solid #b7e4c7",borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div><div style={{fontSize:11,color:"#1a7f3e",fontWeight:600}}>{l.mockCF}</div><div style={{fontSize:9,color:"#5a8a6f"}}>{l.mockCFSub}</div></div>
                  <div style={{fontSize:16,fontWeight:700,color:"#1a7f3e"}}>+46 €</div>
                </div>
                <div style={{padding:"10px 12px",border:"1px solid var(--cb)",borderRadius:8}}>
                  <div style={{fontSize:9,letterSpacing:.8,textTransform:"uppercase",color:"var(--ch)",fontWeight:700,marginBottom:7}}>{l.mockChart}</div>
                  <div style={{display:"flex",gap:3,alignItems:"flex-end",height:42}}>
                    {[30,36,42,50,56,64,70,78,85,92,100].map((h,i)=><div key={i} style={{flex:1,height:h+"%",background:"var(--ca)",borderRadius:"2px 2px 0 0",opacity:.3+i*0.07}}/>)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>

    {/* ═══════════ HOW IT WORKS ═══════════ */}
    <section id="funktioniert" style={{padding:"clamp(40px,5vw,72px) 24px",background:"var(--cc)",borderTop:"1px solid var(--cb)",borderBottom:"1px solid var(--cb)"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:11,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ca)",marginBottom:10,fontWeight:700}}>{l.howTitle}</div>
          <h2 style={{fontSize:"clamp(26px,3vw,38px)",fontWeight:800,color:"var(--ct)",margin:0,letterSpacing:-.5,lineHeight:1.15}}>{l.howShort}</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:24}}>
          {[
            {n:"1",icon:"📍",t:l.step1H,d:l.step1P},
            {n:"2",icon:"📊",t:l.step2H,d:l.step2P},
            {n:"3",icon:"💡",t:l.step3H,d:l.step3P}
          ].map((s,i)=><div key={i} style={{background:"var(--bg)",borderRadius:14,padding:"28px 24px",border:"1px solid var(--cb)",position:"relative",transition:"transform .2s, box-shadow .2s"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 12px 30px rgba(0,0,0,.06)"}} onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=""}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
              <div style={{width:42,height:42,background:"var(--ca-bg)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,border:"1px solid var(--ca-bd)"}}>{s.icon}</div>
              <div style={{fontSize:13,fontWeight:700,color:"var(--ca)",letterSpacing:1}}>STEP {s.n}</div>
            </div>
            <h3 style={{fontSize:18,fontWeight:700,color:"var(--ct)",margin:"0 0 8px",letterSpacing:-.2}}>{s.t}</h3>
            <p style={{fontSize:14,color:"var(--ch)",lineHeight:1.6,margin:0}}>{s.d}</p>
          </div>)}
        </div>
      </div>
    </section>

    {/* ═══════════ CALCULATOR CARDS ═══════════ */}
    <section id="rechner" style={{padding:"clamp(40px,5vw,72px) 24px"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ca)",marginBottom:10,fontWeight:700}}>{l.cardsTitle}</div>
          <h2 style={{fontSize:"clamp(26px,3vw,38px)",fontWeight:800,color:"var(--ct)",margin:0,letterSpacing:-.5,lineHeight:1.15}}>{l.cardsSub}</h2>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:18}}>
          {[
            {tab:"haupt",featured:true,title:l.fullTitle,badge:l.fullBadge,desc:l.fullDesc,feats:[l.fullF1,l.fullF2,l.fullF3,l.fullF4,l.fullF5,l.fullF6],cta:l.fullCta,
             bg:"linear-gradient(135deg,#fff1e8 0%,#ffd9b8 100%)",
             illus:<svg viewBox="0 0 280 130" style={{width:"100%",height:"100%"}} preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#e8600a" stopOpacity=".15"/><stop offset="100%" stopColor="#e8600a" stopOpacity=".4"/></linearGradient></defs><polygon points="40,90 70,55 100,90" fill="url(#g1)" opacity=".6"/><path d="M40 90 L40 105 L100 105 L100 90 Z" fill="#e8600a" opacity=".25"/><polyline points="120,95 150,85 180,70 210,55 240,40" stroke="#e8600a" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/><circle cx="240" cy="40" r="4" fill="#e8600a"/><text x="200" y="32" fontSize="11" fontWeight="700" fill="#c44d00" fontFamily="DM Sans">+4,1%</text><line x1="20" y1="105" x2="260" y2="105" stroke="#e8600a" strokeWidth="1" opacity=".2"/></svg>},
            {tab:"kredit",title:l.finTitle,badge:l.finBadge,desc:l.finDesc,feats:[l.finF1,l.finF2,l.finF3,l.finF4,l.finF5,l.finF6],cta:l.finCta,
             bg:"linear-gradient(135deg,#e8f5ed 0%,#bce4ce 100%)",
             illus:<svg viewBox="0 0 280 130" style={{width:"100%",height:"100%"}} preserveAspectRatio="xMidYMid slice"><g opacity=".75">{[80,95,82,68,55,42,35,28].map((h,i)=><rect key={i} x={140+i*14} y={110-h} width="9" height={h} rx="1.5" fill={i<3?"#5fa97d":"#7dbe97"}/>)}</g><rect x="20" y="40" width="100" height="50" rx="6" fill="#fff" opacity=".7" stroke="#5fa97d" strokeWidth="1"/><text x="42" y="58" fontSize="9" fontWeight="700" fill="#3a7a55" fontFamily="DM Sans" letterSpacing=".5">RATE</text><text x="42" y="78" fontSize="16" fontWeight="700" fill="#2d6043" fontFamily="DM Sans">1.154 €</text><line x1="0" y1="110" x2="280" y2="110" stroke="#5fa97d" strokeWidth="1" opacity=".3"/></svg>},
            {tab:"miete",title:l.rentTitle,badge:l.rentBadge,desc:l.rentDesc,feats:[l.rentF1,l.rentF2,l.rentF3,l.rentF4,l.rentF5,l.rentF6],cta:l.rentCta,
             bg:"linear-gradient(135deg,#fff5e8 0%,#ffd5b8 100%)",
             illus:<svg viewBox="0 0 280 130" style={{width:"100%",height:"100%"}} preserveAspectRatio="xMidYMid slice"><text x="55" y="95" fontSize="68" fontWeight="800" fill="#e8600a" opacity=".12" fontFamily="DM Sans" letterSpacing="-2">§558</text><line x1="35" y1="80" x2="245" y2="80" stroke="#c44d00" strokeWidth="1.5" opacity=".5"/>{[35,105,175,245].map((x,i)=><g key={i}><circle cx={x} cy="80" r={i===2?7:5} fill={i===2?"#e8600a":"#fff"} stroke="#c44d00" strokeWidth="1.5"/></g>)}<rect x="105" y="20" width="78" height="22" rx="11" fill="#e8600a"/><text x="116" y="35" fontSize="11" fontWeight="700" fill="#fff" fontFamily="DM Sans">+15% max. ↑</text></svg>},
            {tab:"sanier",title:l.sanTitle,badge:l.sanBadge,desc:l.sanDesc,feats:[l.sanF1,l.sanF2,l.sanF3,l.sanF4,l.sanF5,l.sanF6],cta:l.sanCta,
             bg:"linear-gradient(135deg,#e8f0f5 0%,#bcd4e6 100%)",
             illus:<svg viewBox="0 0 280 130" style={{width:"100%",height:"100%"}} preserveAspectRatio="xMidYMid slice"><polygon points="35,80 65,55 95,80 95,105 35,105" fill="#7a9bb8" opacity=".4"/>{[{l:"A+",c:"#3aa754",w:42},{l:"A",c:"#5fb86f",w:35},{l:"B",c:"#a3cf6a",w:28},{l:"C",c:"#e8c14f",w:22},{l:"D",c:"#e89545",w:18},{l:"E",c:"#d9613a",w:14}].map((cl,i)=><g key={i}><rect x="160" y={32+i*11} width="20" height="9" rx="1" fill={cl.c}/><rect x="180" y={32+i*11} width={cl.w} height="9" rx="1" fill={cl.c} opacity=".55"/><text x="166" y={40+i*11} fontSize="7" fontWeight="700" fill="#fff" fontFamily="DM Sans">{cl.l}</text></g>)}<text x="240" y="68" fontSize="14" fontWeight="800" fill="#1d6af5" fontFamily="DM Sans">−60%</text><text x="248" y="80" fontSize="9" fill="#5a7a9a" fontFamily="DM Sans">CO₂</text></svg>}
          ].map((c,i)=><button key={i} onClick={()=>onStart(c.tab)} style={{display:"flex",flexDirection:"column",background:"var(--cc)",border:c.featured?"2px solid var(--ca)":"1.5px solid var(--cb)",borderRadius:14,overflow:"hidden",textAlign:"left",cursor:"pointer",transition:"all .2s",padding:0,fontFamily:"inherit",position:"relative"}} onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.borderColor="var(--ca)";e.currentTarget.style.boxShadow="0 8px 24px rgba(232,96,10,.12)"}} onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.borderColor=c.featured?"var(--ca)":"var(--cb)";e.currentTarget.style.boxShadow=""}}>
            <div style={{height:130,background:c.bg,position:"relative",overflow:"hidden",borderBottom:"1px solid rgba(0,0,0,.05)"}}>
              {c.illus}
            </div>
            <div style={{padding:"22px 22px 22px",flex:1}}>
              <div style={{display:"inline-block",fontSize:9,fontWeight:700,letterSpacing:1.2,textTransform:"uppercase",color:c.featured?"#fff":"var(--ca)",background:c.featured?"var(--ca)":"var(--ca-bg)",padding:"3px 8px",borderRadius:4,marginBottom:10}}>{c.badge}</div>
              <h3 style={{fontSize:18,fontWeight:700,color:"var(--ct)",margin:"0 0 8px",letterSpacing:-.2}}>{c.title}</h3>
              <p style={{fontSize:12,color:"var(--ch)",lineHeight:1.6,margin:"0 0 14px"}}>{c.desc}</p>
              <div style={{display:"flex",flexDirection:"column",gap:5}}>
                {c.feats.map((f,j)=><div key={j} style={{fontSize:11,color:"var(--cl)",display:"flex",gap:6,alignItems:"flex-start"}}><span style={{color:"var(--ca)",flexShrink:0}}>✓</span><span>{f}</span></div>)}
              </div>
            </div>
          </button>)}
        </div>
      </div>
    </section>

    {/* ═══════════ DATEN-ABSCHNITT ═══════════ */}
    <section style={{background:"var(--bg)",borderTop:"1px solid var(--cb)",padding:"clamp(40px,5vw,72px) 24px"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ca)",marginBottom:10,fontWeight:700}}>{l.dataEyebrow}</div>
          <h2 style={{fontSize:"clamp(24px,3vw,36px)",fontWeight:800,color:"var(--ct)",margin:"0 0 14px",letterSpacing:-.5,lineHeight:1.15}}>{l.dataTitle}</h2>
          <p style={{fontSize:15,color:"var(--ch)",maxWidth:520,margin:"0 auto",lineHeight:1.6}}>{l.dataSub}</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,marginBottom:28}}>
          {[
            {ic:"💰",label:l.dc1L,val:`${MARKET_RATES.avg.toLocaleString("de-DE",{minimumFractionDigits:2})} %`,sub:l.dc1S},
            {ic:"📊",label:l.dc2L,val:"+2,1 %/Jahr",sub:l.dc2S},
            {ic:"🏠",label:l.dc3L,val:"+2,0 %/Jahr",sub:l.dc3S},
            {ic:"🏛️",label:l.dc4L,val:l.dc4V,sub:l.dc4S},
            {ic:"⚖️",label:l.dc5L,val:l.dc5V,sub:l.dc5S},
            {ic:"🏗️",label:l.dc6L,val:l.dc6V,sub:l.dc6S},
            {ic:"🌱",label:l.dc7L,val:l.dc7V,sub:l.dc7S},
            {ic:"📋",label:l.dc8L,val:l.dc8V,sub:l.dc8S},
            {ic:"💶",label:l.dc9L,val:l.dc9V,sub:l.dc9S,green:true}
          ].map((d,i)=><div key={i} style={{background:"var(--cc)",borderRadius:12,border:"1px solid var(--cb)",padding:"14px 16px"}}>
            <div style={{fontSize:20,marginBottom:6}}>{d.ic}</div>
            <div style={{fontSize:11,color:"var(--ch)",fontWeight:500,marginBottom:4}}>{d.label}</div>
            <div style={{fontSize:18,fontWeight:700,color:d.green?"#22c55e":"var(--ca)",lineHeight:1.1,marginBottom:3}}>{d.val}</div>
            <div style={{fontSize:11,color:"var(--ch)"}}>{d.sub}</div>
          </div>)}
        </div>
        <div style={{textAlign:"center",display:"flex",alignItems:"center",justifyContent:"center",gap:6,fontSize:12,color:"var(--ch)"}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",display:"inline-block",flexShrink:0}}/>
          <span>{(()=>{const n=new Date();return l.dataStand+" "+n.toLocaleDateString(LANG_LOCALE[lang]||"de-DE",{month:"long",year:"numeric"});})()}</span>
        </div>
      </div>
    </section>

    {/* ═══════════ USP ═══════════ */}
    <section style={{background:"var(--cc)",borderTop:"1px solid var(--cb)",borderBottom:"1px solid var(--cb)",padding:"clamp(40px,5vw,72px) 24px"}}>
      <div style={{maxWidth:1100,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{fontSize:11,letterSpacing:2.5,textTransform:"uppercase",color:"var(--ca)",marginBottom:10,fontWeight:700}}>{l.uspTitle}</div>
          <h2 style={{fontSize:"clamp(26px,3vw,38px)",fontWeight:800,color:"var(--ct)",margin:0,letterSpacing:-.5,lineHeight:1.15}}>{l.uspSub}</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:24}}>
          {[
            {ic:"⚖️",h:l.usp2H,p:l.usp2P},
            {ic:"🔒",h:l.usp5H,p:l.usp5P},
            {ic:"🌐",h:l.usp6H,p:l.usp6P},
            {ic:"💻",h:l.usp4H,p:l.usp4P}
          ].map((u,i)=><div key={i}>
            <div style={{fontSize:28,marginBottom:12}}>{u.ic}</div>
            <h3 style={{fontSize:15,fontWeight:700,color:"var(--ct)",margin:"0 0 6px"}}>{u.h}</h3>
            <p style={{fontSize:13,color:"var(--ch)",lineHeight:1.6,margin:0}}>{u.p}</p>
          </div>)}
        </div>
      </div>
    </section>

    {/* ═══════════ ZINSEN — discreet ticker section ═══════════ */}
    <section id="zinsen" style={{padding:"clamp(30px,4vw,50px) 24px"}}>
      <div style={{maxWidth:860,margin:"0 auto"}}>
        <div style={{borderLeft:"3px solid var(--ca)",paddingLeft:18}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,fontSize:10,color:"var(--ca)",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase"}}>
            <span style={{width:6,height:6,background:"var(--ca)",borderRadius:"50%",animation:"pulse 2s infinite"}}/>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
            📊 {l.ratesTitle} · {l.ratesStand}: {zinsen?.stand||MARKET_RATES.stand}
          </div>
          <p style={{margin:"0 0 6px",fontSize:13,color:"var(--cl)",lineHeight:1.7}}>
            {l.ratesIntro2} <strong>{l.ratesCompact}: {(zinsen?.avg||MARKET_RATES.avg)} %</strong> · {l.ratesShort}: <strong>{(zinsen?.top||MARKET_RATES.top)} %</strong>
            {zB&&<> · {l.ratesShort3}: <strong>{zB} %</strong></>}
          </p>
          <p style={{margin:0,fontSize:11,color:"var(--ch)",lineHeight:1.5}}>{l.ratesSources}: Dr. Klein, Vergleich.de, Finanztip, Finanzfacts, Interhyp, Deutsche Bundesbank · {l.ratesDisclaim}</p>
        </div>
      </div>
    </section>

    {/* ═══════════ FOOTER ═══════════ */}
    <footer style={{marginTop:"auto",borderTop:"1px solid var(--cb)",padding:"32px 24px 28px",background:"var(--cc)"}}>
      <div style={{maxWidth:1280,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16,marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <img src="/icon-192.png" alt="Immofuchs" style={{width:36,height:36,objectFit:"contain",borderRadius:8}}/>
            <div style={{fontSize:17,fontWeight:800,letterSpacing:-.3,color:"var(--ct)"}}>immo<span style={{color:"var(--ca)"}}>fuchs</span><span style={{color:"var(--ct)"}}>.info</span></div>
          </div>
          <div style={{display:"flex",gap:24,fontSize:13,color:"var(--cl)",flexWrap:"wrap"}}>
            <button onClick={openImpressum} style={{...navLink,fontSize:13}}>{l.imp}</button>
            <button onClick={openDatenschutz} style={{...navLink,fontSize:13}}>{l.dse}</button>
          </div>
        </div>
        <div style={{paddingTop:18,borderTop:"1px solid var(--cb)",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,fontSize:11,color:"var(--ch)"}}>
          <div>{l.footerCr}</div>
          <div style={{maxWidth:600,lineHeight:1.6,opacity:.85}}>{l.footerNote}</div>
        </div>
      </div>
    </footer>

    {/* Responsive nav styles */}
    <style>{`
      @media(max-width:880px){
        .lp-nav{display:none!important}
        .lp-burger{display:inline-flex!important}
      }
      @media(min-width:881px){
        .lp-nav-mobile{display:none!important}
      }
      @media(max-width:560px){
        .lp-cta{display:none!important}
      }
    `}</style>
  </div>;
}

// Helper styles for nav links (used in Landing component)
const navLink={background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:600,color:"var(--cl)",padding:"6px 0",letterSpacing:.1,transition:"color .15s"};
const navLinkMobile={...navLink,padding:"12px 4px",fontSize:15,textAlign:"left",borderBottom:"1px solid var(--cb)"};


// ═══════════ LEGAL MODAL (Datenschutz / Impressum) ═══════════
function LegalModal({type,onClose}){
  if(!type)return null;
  const content=type==="impressum"?{
    title:"Impressum",
    sub:"Anbieterkennzeichnung nach § 5 TMG",
    body:<>
      <h3 style={lmH3}>Angaben zum Betreiber</h3>
      <div style={{background:"var(--ci)",border:"1px solid var(--cb)",borderRadius:10,padding:"16px 20px",margin:"12px 0",fontSize:13,lineHeight:1.8}}>
        <strong>Engin Celenk (kein Unternehmen)</strong><br/>
        Diese Website wird von einer Privatperson betrieben und ist kein kommerzielles Angebot.<br/><br/>
        Kontakt per E-Mail: <a href="mailto:info@immofuchs.info" style={lmA}>info@immofuchs.info</a>
      </div>
      <div style={{background:"var(--ca-bg)",border:"1px solid var(--ca-bd)",borderRadius:8,padding:"12px 16px",fontSize:12,color:"#7a3800",margin:"16px 0"}}>
        ℹ️ Diese Website stellt kostenlose Rechner-Tools für private Nutzung bereit. Es werden keine Produkte oder Dienstleistungen verkauft. Es besteht kein Handelsgewerbe.
      </div>
      <h3 style={lmH3}>Verantwortlich i. S. d. § 18 Abs. 2 MStV</h3>
      <p style={lmP}>Der Websitebetreiber (Kontaktadresse wie oben).</p>
      <h3 style={lmH3}>Haftung für Inhalte</h3>
      <p style={lmP}>Als Diensteanbieter bin ich gemäß § 7 Abs. 1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG bin ich jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
      <p style={lmP}>Die Berechnungen auf dieser Website dienen ausschließlich der Orientierung und ersetzen keine professionelle Rechts-, Steuer- oder Finanzberatung. Für die Richtigkeit der Ergebnisse wird keine Gewähr übernommen.</p>
      <h3 style={lmH3}>Haftung für Links</h3>
      <p style={lmP}>Diese Website enthält keine bezahlten Affiliate-Links und keine Werbung. Sollten externe Links vorhanden sein, haben wir auf deren Inhalte keinen Einfluss. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.</p>
      <h3 style={lmH3}>Urheberrecht</h3>
      <p style={lmP}>Die erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Rechner dürfen frei genutzt, jedoch nicht ohne Erlaubnis kopiert oder kommerziell verwertet werden.</p>
      <h3 style={lmH3}>Verbraucherstreitbeilegung</h3>
      <p style={lmP}>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" style={lmA}>https://ec.europa.eu/consumers/odr</a>. Ich bin weder verpflichtet noch bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen, da kein Verbrauchervertrag besteht.</p>
    </>
  }:{
    title:"Datenschutzerklärung",
    sub:null,
    body:<>
      <div style={{background:"var(--ca-bg)",border:"1px solid var(--ca-bd)",borderRadius:8,padding:"12px 16px",fontSize:12,color:"#7a3800",margin:"16px 0"}}>
        <strong>Kurz &amp; klar:</strong> immofuchs.info verzichtet vollständig auf Tracking, Analytics, Werbung und Affiliate-Links. Alle Berechnungen laufen ausschließlich lokal in Ihrem Browser. Es werden keine personenbezogenen Daten an Server übertragen.
      </div>
      <h3 style={lmH3}>1. Verantwortliche Stelle</h3>
      <p style={lmP}>Engin Celenk (kein Unternehmen, keine kommerzielle Tätigkeit).<br/>Kontakt: <a href="mailto:info@immofuchs.info" style={lmA}>info@immofuchs.info</a></p>
      <h3 style={lmH3}>2. Datenverarbeitung auf einen Blick</h3>
      <p style={lmP}>Immofuchs ist eine rein clientseitige Webanwendung. Alle Berechnungen finden ausschließlich in Ihrem Browser statt. Es werden <strong>keine personenbezogenen Daten an Server übertragen</strong>.</p>
      <h3 style={lmH3}>3. Lokale Datenspeicherung (localStorage)</h3>
      <p style={lmP}>Ihre Eingaben (Kaufpreis, Zinssatz, etc.) werden im localStorage Ihres Browsers gespeichert, damit Sie beim nächsten Besuch fortfahren können. Diese Daten:</p>
      <ul style={lmUl}><li>verlassen niemals Ihren Browser</li><li>sind nur für Sie zugänglich</li><li>können jederzeit über die Browser-Einstellungen gelöscht werden</li></ul>
      <h3 style={lmH3}>4. Cookies</h3>
      <p style={lmP}>Immofuchs setzt <strong>keine Tracking-Cookies</strong>. Es wird lediglich localStorage verwendet (technisch notwendig).</p>
      <h3 style={lmH3}>5. Hosting &amp; Server-Logs</h3>
      <p style={lmP}>Die Website wird bei einem Hosting-Anbieter betrieben. Beim Abrufen der Seiten werden durch den Hosting-Anbieter automatisch technische Zugriffsdaten in Server-Log-Dateien gespeichert (Browsertyp, Betriebssystem, Referrer-URL, Datum/Uhrzeit, IP-Adresse). Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO.</p>
      <h3 style={lmH3}>6. Externe Dienste</h3>
      <p style={lmP}>Zur Darstellung der Website werden Schriftarten von Google Fonts (DM Sans) geladen. Dabei kann die IP-Adresse an Google übertragen werden.</p>
      <p style={lmP}>Optional werden tagesaktuelle Bauzinsen von einer öffentlichen JSON-Datei geladen (GitHub Pages). Diese Datei enthält keine personenbezogenen Daten; beim Abruf wird Ihre IP-Adresse an GitHub übertragen.</p>
      <p style={lmP}>Es werden <strong>keine</strong> weiteren externen Dienste eingebunden — kein Google Analytics, keine Werbung, kein Facebook Pixel, keine Affiliate-Links.</p>
      <h3 style={lmH3}>7. Ihre Rechte (DSGVO)</h3>
      <p style={lmP}>Sie haben das Recht auf:</p>
      <ul style={lmUl}>
        <li>Auskunft über verarbeitete Daten (Art. 15 DSGVO)</li>
        <li>Berichtigung (Art. 16 DSGVO)</li>
        <li>Löschung (Art. 17 DSGVO) — Löschen Sie Ihre Browser-Daten</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
        <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO)</li>
        <li>Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO)</li>
      </ul>
      <p style={lmP}>Für Anfragen: <a href="mailto:info@immofuchs.info" style={lmA}>info@immofuchs.info</a></p>
      <h3 style={lmH3}>8. SSL-/TLS-Verschlüsselung</h3>
      <p style={lmP}>Diese Seite nutzt aus Sicherheitsgründen eine SSL-/TLS-Verschlüsselung.</p>
    </>
  };
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,animation:"lmFade .2s ease"}}>
    <style>{`@keyframes lmFade{from{opacity:0}to{opacity:1}}@keyframes lmSlide{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    <div onClick={e=>e.stopPropagation()} style={{background:"var(--cc)",borderRadius:14,maxWidth:720,width:"100%",maxHeight:"88vh",overflow:"hidden",display:"flex",flexDirection:"column",animation:"lmSlide .25s ease",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
      <div style={{padding:"20px 24px",borderBottom:"1px solid var(--cb)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:700,color:"var(--ca)",margin:0}}>{content.title}</h2>
          <p style={{fontSize:12,color:"var(--ch)",margin:"4px 0 0"}}>{content.sub}</p>
        </div>
        <button onClick={onClose} aria-label="Schließen" style={{background:"var(--ci)",border:"1px solid var(--cb)",borderRadius:8,width:34,height:34,fontSize:18,cursor:"pointer",color:"var(--ch)",display:"flex",alignItems:"center",justifyContent:"center",padding:0,fontFamily:"inherit"}}>×</button>
      </div>
      <div style={{padding:"20px 24px",overflow:"auto",flex:1,fontSize:13,color:"var(--cl)",lineHeight:1.7}}>
        {content.body}
      </div>
      <div style={{padding:"14px 24px",borderTop:"1px solid var(--cb)",background:"var(--ci)",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"var(--ch)",flexShrink:0,flexWrap:"wrap",gap:8}}>
        <span>© 2026 immofuchs.info · Engin Celenk</span>
        <button onClick={onClose} style={{background:"var(--ca)",color:"#fff",border:"none",borderRadius:6,padding:"8px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Schließen</button>
      </div>
    </div>
  </div>;
}
const lmH3={fontSize:14,fontWeight:700,color:"var(--ct)",marginTop:20,marginBottom:8};
const lmP={fontSize:13,color:"var(--cl)",marginBottom:8,lineHeight:1.7};
const lmUl={paddingLeft:20,marginBottom:8,fontSize:13,color:"var(--cl)",lineHeight:1.8};
const lmA={color:"var(--ca)",textDecoration:"none"};



// ── Statusleiste ─────────────────────────────────────────────────────────────
const Statusleiste=()=>{const {t}=useApp();
  const now=new Date();
  const monat=now.toLocaleDateString("de-DE",{month:"long",year:"numeric"});
  return <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",background:"var(--ci)",border:"1px solid var(--cb)",borderRadius:8,fontSize:12,color:"var(--ch)",marginBottom:14}}>
    <span style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",display:"inline-block",flexShrink:0}}/>
    <span>{t.datastand}: {monat}</span>
  </div>;
};

export default function App(){const[tab,setTab]=useState("haupt");const[lang,setLang]=useState("de");
  const[landed,setLanded]=useState(()=>sessionStorage.getItem("if_landed")==="1");
  const[zinsen,setZinsen]=useState(null); // holds the raw zinsen.json config (with live BBK)
  const[legalModal,setLegalModal]=useState(null);
  const zinssatzTouchedRef=useRef(false); // true once user manually edits the field

  // ── Zinsen laden: zinsen.json (lokal, kein Bundesbank-API-Call wegen CORS) ──
  useEffect(()=>{
    async function loadZinsen(){
      // 1. Cache check (max 60 Minuten)
      try{
        const cached=localStorage.getItem("if_zinsen_v3");
        if(cached){
          const{ts,data}=JSON.parse(cached);
          if(Date.now()-ts < 60*60*1000){setZinsen(data);return;}
        }
      }catch(e){}

      // 2. zinsen.json von eigenem Server laden (Bundesbank-API entfällt wegen CORS)
      let config=null;
      try{
        const res=await fetch("/zinsen.json");
        if(res.ok) config=await res.json();
      }catch(e){console.warn("[zinsen] zinsen.json nicht geladen:",e);}
      if(!config){setZinsen(null);return;}

      // 3. Durchschnitt berechnen (nur positive Werte, auto=false ignoriert Bundesbank-Platzhalter)
      const werte=config.quellen.map(q=>q.wert).filter(v=>v>0);
      const avg=werte.reduce((a,b)=>a+b,0)/werte.length;
      config.avg=Math.round(avg*20)/20; // auf 0.05 runden
      config.top=Math.min(...werte);    // bester (niedrigster) Wert

      setZinsen(config);
      try{localStorage.setItem("if_zinsen_v3",JSON.stringify({ts:Date.now(),data:config}));}catch(e){}
    }
    loadZinsen();
  },[]);

  // ── Wenn Live-Durchschnitt kommt und User hat nichts getippt → Default setzen ──
  useEffect(()=>{
    if(zinssatzTouchedRef.current) return;
    if(zinsen?.avg){
      const live=String(zinsen.avg);
      setData(p=>({...p,zinssatz:live}));
    }
  },[zinsen]);

  const[data,setData]=useState({bundesland:"BW",plz:"70173",ort:"Stuttgart",kaufpreis:"300000",flaeche:"60",kaltmiete:"900",eigenkapital:"60000",zinssatz:String(MARKET_RATES.avg),tilgung:"1",zinsbindung:"10",notar:"2.0",makler:"3.57",steuersatz:"30",afaSatz:"2",grundAnteil:"20",gebAnteil:"80",wertP:"2",jahre:"10",sonder:"3000",renovierung:"15000",nichtUml:"100",leerstand:"2",vergleichsmiete:"14",letzteErhDatum:new Date(new Date().getFullYear()-2,new Date().getMonth(),1).toISOString().split("T")[0],letzteErhMiete:"800",mietJahre:"10",sanFl:"140",sanBj:"1981",sanHt:"heizoel",sanHa:"alt",sanPe:"3",garage:"20000",mieteQm:"15",vermietet:"ja",immLeer:"nein"});
  const set=useCallback((k,v)=>{
    if(k==="zinssatz") zinssatzTouchedRef.current=true;
    setData(p=>({...p,[k]:v}));
  },[]);
  const t=T[lang];
  const tabs=[{id:"haupt",l:t.haupt,ic:IC.haupt},{id:"kredit",l:t.kredit,ic:IC.kredit},{id:"miete",l:t.miete,ic:IC.miete},{id:"sanier",l:t.sanier,ic:IC.sanier}];

  const startApp=(startTab)=>{if(startTab&&tabs.find(x=>x.id===startTab))setTab(startTab);sessionStorage.setItem("if_landed","1");setLanded(true);window.scrollTo({top:0,behavior:"instant"});};
  if(!landed)return <><style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');:root{--bg:#f5f5f0;--cc:#fff;--ct:#1a1a1a;--cl:#3d3d3a;--ch:#8a8a80;--cb:#e5e5dc;--ci:#fafaf7;--ca:#e8600a;--ca-dk:#c44d00;--ca-bg:#fff1e8;--ca-bd:#f5cba9}*{box-sizing:border-box;margin:0;padding:0}body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--ct);-webkit-font-smoothing:antialiased}`}</style><Landing onStart={startApp} zinsen={zinsen} lang={lang} setLang={setLang} openDatenschutz={()=>setLegalModal("datenschutz")} openImpressum={()=>setLegalModal("impressum")}/><LegalModal type={legalModal} onClose={()=>setLegalModal(null)}/></>;

  return <Ctx.Provider value={{d:data,set,t,lang,zinsen,tip:k=>(TIPS[lang]||TIPS.de)[k]}}>
    <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
      :root{--bg:#f5f5f0;--cc:#fff;--ct:#1a1a1a;--cl:#3d3d3a;--ch:#8a8a80;--cb:#e5e5dc;--ci:#fafaf7;--cro:#f0f0ea;--ca:#e8600a;--ca-dk:#c44d00;--ca-bg:#fff1e8;--ca-bd:#f5cba9}
      html,body{margin:0;padding:0;overflow-x:hidden;-webkit-text-size-adjust:100%}
      *{box-sizing:border-box}
      body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--ct);-webkit-font-smoothing:antialiased}
      input,select,button,textarea{font-family:inherit;font-size:16px}
      input[type="number"]::-webkit-inner-spin-button{opacity:.3}
      .shell{max-width:1400px;margin:0 auto;padding:calc(78px + env(safe-area-inset-top)) 0 calc(72px + env(safe-area-inset-bottom));min-height:100dvh}
      .hdr{position:fixed;top:0;left:0;right:0;z-index:50;padding:10px 16px;background:rgba(245,245,240,.92);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-bottom:1px solid var(--cb);display:flex;justify-content:space-between;align-items:center;height:78px;padding-top:calc(10px + env(safe-area-inset-top))}
      .hdr{height:calc(78px + env(safe-area-inset-top))}
      .hdr-inner{max-width:1400px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;width:100%}
      .tbar{position:fixed;bottom:0;left:0;right:0;z-index:100;background:var(--cc);border-top:1px solid var(--cb);padding:6px 0 calc(6px + env(safe-area-inset-bottom));display:flex;justify-content:center}
      .tbtn{flex:1;max-width:110px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 0;border:none;background:none;cursor:pointer;min-height:48px}
      .tbtn span{font-size:11px;font-weight:600;letter-spacing:.3px}
      .content{padding:14px 14px;max-width:1400px;margin:0 auto;width:100%;overflow-x:hidden}
      .ls{font-size:14px;padding:8px 10px;border:1px solid var(--cb);border-radius:8px;background:var(--ci);color:var(--ct);cursor:pointer;font-family:inherit;min-height:38px}
      /* MOBILE-FIRST DEFAULTS — apply to all viewports < 700px */
      .if-row{display:grid;grid-template-columns:1fr;gap:0}
      .if-row > *{margin-bottom:14px}
      .mob-toggle{display:flex;background:var(--cc);border:1px solid var(--cb);border-radius:12px;padding:4px;margin-bottom:14px;gap:4px}
      .mob-toggle button{flex:1;padding:11px 12px;font-size:15px;font-weight:600;border:none;border-radius:9px;background:transparent;color:var(--cl);cursor:pointer;font-family:inherit;min-height:44px}
      .mob-toggle button.act{background:var(--ca);color:#fff}
      .mob-next-btn{display:none;width:100%;padding:14px;font-size:16px;font-weight:700;background:var(--ca);color:#fff;border:none;border-radius:12px;cursor:pointer;font-family:inherit;margin-top:16px;letter-spacing:.3px}
      .hdr-tag{display:none}
      /* TABLET / DESKTOP — overrides */
      @media(min-width:760px){
        .hdr-tag{display:block!important}
      }
      /* TABLET / DESKTOP — overrides */
      @media(min-width:700px){
        .mob-toggle{display:none!important}
        .if-row{grid-template-columns:1fr 1fr;gap:12px}
        .if-row > *{margin-bottom:14px}
        .split{display:grid;grid-template-columns:1fr 1.15fr;gap:24px;align-items:start}
        .inp-pane,.res-pane{display:block!important}
        .res-pane{position:sticky;top:94px}
        .content{padding:24px 28px}
        .tbar{max-width:640px;margin:0 auto;left:0;right:0;border-radius:16px 16px 0 0;box-shadow:0 -2px 12px rgba(0,0,0,.05)}
      }
      @media(min-width:1100px){
        .split{grid-template-columns:1fr 1.25fr;gap:32px}
        .content{padding:28px 40px}
      }
      @media(max-width:699px){
        .inp-pane,.res-pane{display:none}
        .inp-pane.act,.res-pane.act{display:block}
        .mob-next-btn{display:block}
      }
      @media print{
        .tbar,.hdr,.mob-toggle,.inp-pane,.no-print{display:none!important}
        .res-pane{display:block!important}
        .split{display:block!important}
        .shell{padding:0;max-width:100%}
        .content{padding:10px}
        body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        svg{max-width:100%}
      }`}
    </style>
    <div className="shell" dir="ltr">
      <div className="hdr">
        <div className="hdr-inner">
          <button onClick={()=>{sessionStorage.removeItem("if_landed");setLanded(false)}} title="Zur Startseite" style={{display:"flex",alignItems:"center",gap:14,background:"none",border:"none",cursor:"pointer",padding:0,fontFamily:"inherit"}}>
            <img src="/icon-192.png" alt="Immofuchs" style={{width:54,height:54,objectFit:"contain",flexShrink:0}}/>
            <div style={{fontSize:24,fontWeight:800,letterSpacing:-.5,lineHeight:1,color:"var(--ct)"}}>immo<span style={{color:"var(--ca)"}}>fuchs</span><span style={{color:"var(--ct)",fontWeight:700}}>.info</span></div>
          </button>
          <LangSel lang={lang} setLang={setLang}/>
        </div>
      </div>
      <div className="content">
        <Statusleiste/>
        {tab==="haupt"&&<Haupt/>}{tab==="kredit"&&<Kredit/>}{tab==="miete"&&<Miete/>}{tab==="sanier"&&<Sanier/>}
        <div style={{marginTop:32,paddingTop:18,borderTop:"1px solid var(--cb)",fontSize:10,color:"var(--ch)",textAlign:"center",display:"flex",justifyContent:"center",gap:16,flexWrap:"wrap"}}>
          <button onClick={()=>{sessionStorage.removeItem("if_landed");setLanded(false)}} style={{background:"none",border:"none",color:"var(--ca)",cursor:"pointer",fontSize:10,fontFamily:"inherit",padding:0}}>← Startseite</button>
          <span style={{opacity:.4}}>·</span>
          <button onClick={()=>setLegalModal("impressum")} style={{background:"none",border:"none",color:"var(--ca)",cursor:"pointer",fontSize:10,fontFamily:"inherit",padding:0}}>Impressum</button>
          <span style={{opacity:.4}}>·</span>
          <button onClick={()=>setLegalModal("datenschutz")} style={{background:"none",border:"none",color:"var(--ca)",cursor:"pointer",fontSize:10,fontFamily:"inherit",padding:0}}>Datenschutz</button>
        </div>
      </div>
      <div className="tbar">{tabs.map(tb=><button key={tb.id} className="tbtn" onClick={()=>{setTab(tb.id);window.scrollTo({top:0,behavior:"smooth"});}}>{tb.ic(tab===tb.id)}<span style={{color:tab===tb.id?"var(--ca)":"var(--ch)"}}>{tb.l}</span></button>)}</div>
    </div>
    <LegalModal type={legalModal} onClose={()=>setLegalModal(null)}/>
  </Ctx.Provider>;
}
