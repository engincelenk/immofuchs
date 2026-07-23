export const VFE_T = {
  de: {
    secEck: "Eckdaten des Darlehens",
    secKuend: "Kündigung & Marktdaten",
    lAuszahlung: "Auszahlungsdatum",
    lZbEnde: "Ende Sollzinsbindung",
    lRestschuld: "Aktuelle Restschuld",
    lRestschuldDatum: "Datum der Restschuld",
    lNominalzins: "Nominalzins p.a.",
    lRate: "Monatliche Rate",
    lKuendigung: "Geplanter Kündigungstermin",
    lSonderJ: "Jährl. Sondertilgung",
    lSonderGeleistet: "Sondertilgung dies. Jahr geleistet?",
    lWiederanlage: "Wiederanlagezins (Pfandbrief) p.a.",
    lBearbeitung: "Bearbeitungsentgelt der Bank",
    hintFin: "↩ Finanzierungsrechner",
    hintCalc: "↩ berechnet",
    hintPfand:
      "Die Bank darf nur den Zins ansetzen, den sie mit dem zurückgezahlten Geld tatsächlich woanders verdienen könnte — das ist die Pfandbriefrendite. Aktuelle Werte: bundesbank.de oder fmh.de",
    yes: "Ja",
    no: "Nein",
    toResult: "Ergebnis →",
    emptyTitle: "Wie teuer wird der vorzeitige Ausstieg?",
    emptyMin:
      "Die Bank berechnet dir eine Strafe, wenn du deinen Kredit vor Ende der Zinsbindung zurückzahlst — diese heißt Vorfälligkeitsentschädigung (VFE). Wie hoch sie ausfällt, hängt davon ab, wie lange dein Zins noch läuft und wie viel die Bank heute bei einer Neuanlage verdienen würde. Füll einfach die Felder links aus — Beispielwerte sind bereits eingetragen.",
    freeTitle: "✅ Kostenlose Kündigung möglich (§ 489 BGB)",
    freeBodyA:
      "Gute Neuigkeit: Ab dem {date} kannst du diesen Kredit kostenlos kündigen — die Bank darf dann keine VFE mehr verlangen.",
    freeBodyB:
      "Das Gesetz (§ 489 BGB) gibt jedem Kreditnehmer das Recht, 10 Jahre nach Auszahlung mit 6 Monaten Frist kostenfrei zu kündigen — egal wie lang die ursprüngliche Zinsbindung war.",
    resOverview: "Ergebnisübersicht",
    rZins: "Zinsverschlechterungsschaden",
    rRisiko: "Risikoersparnis (0,1 %-Punkte p.a.)",
    rVerw: "Verwaltungskostenersparnis (4 €/Buchung)",
    rBearb: "Bearbeitungsentgelt Bank",
    rNetto: "Netto-Vorfälligkeitsentschädigung",
    negNote:
      "ℹ️ Interessant: Rechnerisch ist deine VFE negativ — das heißt, die Bank würde mit deiner vorzeitigen Rückzahlung sogar Geld verdienen, weil sie das Kapital heute zu {wa}% anlegen kann, statt dir nur {zp}% zu geben. Leider bedeutet das nicht, dass die Bank dir Geld zurückzahlt. Ein entsprechendes BGH-Urteil gibt es bisher nicht.",
    explainPosTitle: "💸 Was bedeutet das für dich?",
    explainPos:
      "Kurz gesagt: Wenn du deinen Kredit jetzt vorzeitig ablöst, musst du diesen Betrag an deine Bank zahlen. Er heißt Vorfälligkeitsentschädigung — also eine Gebühr dafür, dass du früher aus dem Vertrag aussteigst als vereinbart.\n\nWarum verlangt die Bank das? Sie hatte mit deinen Zinszahlungen bis zum Ende der Zinsbindung fest kalkuliert. Durch die vorzeitige Rückzahlung fallen diese Einnahmen weg — und genau diesen Verlust lässt sie sich ersetzen.\n\nOb sich eine Umschuldung trotz VFE rechnet, hängt von deinem neuen Zinssatz ab. Wenn der aktuelle Marktzins deutlich günstiger ist als dein Vertragszins, kann es sich dennoch lohnen.",
    explainNegTitle: "🤔 Was bedeutet das für dich?",
    explainNeg:
      "Das Ergebnis ist negativ — klingt erstmal gut, ist aber kein Grund zur Freude.\n\nWas steckt dahinter? Die Bank könnte das zurückgezahlte Geld heute zu einem höheren Zins anlegen, als du ihr schuldest. Rechnerisch entsteht ihr also gar kein Schaden — im Gegenteil, sie würde davon profitieren.\n\nTrotzdem bedeutet das nicht, dass die Bank dir etwas erstattet. Es gibt bisher kein BGH-Urteil, das eine Rückzahlung vorschreibt. Sprich das direkt mit deiner Bank an und bestehe auf der detaillierten Berechnung.",
    planTitle: "📊 Tilgungsplan ab Kündigung",
    planOpen: "▼ öffnen",
    planClose: "▲ schließen",
    planMonths: "Monate",
    thJahr: "Jahr",
    thRest: "Restschuld",
    thTilg: "Tilgung",
    thZinsOrig: "Zinsen orig.",
    thZinsWA: "Zinsen WA",
    thZinsverlust: "Zinsverlust",
    thAbgezinst: "Abgezinst",
    sum: "Summe",
    disclaimer:
      "⚖️ Dieser Rechner arbeitet nach der vom BGH vorgeschriebenen Aktiv-Passiv-Methode (AZ: XI ZR 285/03) mit Pfandbriefsätzen — genau wie die meisten Banken. Das Ergebnis ist eine belastbare Orientierung, aber keine Rechtsberatung. Die endgültige Berechnung kommt von deiner Bank. Bei Abweichungen lohnt es sich, die Bank nach ihrer detaillierten Aufstellung zu fragen.",
    phRestschuld: "z.B. 350000",
    cap489:
      "§ 489 BGB begrenzt den Schaden: Ab dem {date} hättest du kostenlos kündigen können (10 Jahre + 6 Monate nach Auszahlung). Die Bank darf deshalb nur den Schaden bis zu diesem Datum berechnen — alles danach wird nicht berücksichtigt. Das drückt die VFE in deinem Fall deutlich.",
    tipAuszahlung:
      "Datum, an dem das Darlehen vollständig ausgezahlt wurde. Maßgeblich für die §489-Frist (10 Jahre + 6 Monate Karenzzeit).",
    tipZbEnde:
      "Ende der vereinbarten Sollzinsbindung. Bis zu diesem Datum entsteht der Bank ein Zinsschaden bei vorzeitiger Ablösung.",
    tipRestschuld: "Aktueller Darlehenssaldo laut Bank zum unten angegebenen Stichtag.",
    tipRestschuldDatum:
      "Stichtag, auf den sich die eingegebene Restschuld bezieht. Von hier wird bis zum Kündigungstermin fortgerechnet.",
    tipNominalzins:
      "Vertraglicher Sollzins p.a. (nicht Effektivzins). Wird automatisch aus dem Finanzierungsrechner übernommen, falls dort gesetzt.",
    tipRate:
      "Aktuelle monatliche Annuität (Zins + Tilgung). Wird aus dem Finanzierungsrechner geschätzt, falls leer.",
    tipKuendigung:
      "Geplanter Termin der vorzeitigen Ablösung. Muss nach dem Restschuld-Stichtag und vor dem Zinsbindungsende liegen.",
    tipSonderJ:
      "Vertraglich vereinbarte jährliche Sondertilgung (§ 500 BGB). Reduziert die Restschuld und damit den Zinsschaden. 0 = keine.",
    tipSonderGeleistet:
      "Wurde die diesjährige Sondertilgung bereits geleistet? Ja = nächste Sondertilgung erst im Folgejahr. Nein = sie wird für das laufende Jahr berücksichtigt. Nur relevant, wenn eine jährliche Sondertilgung > 0 € eingetragen ist.",
    tipWiederanlage:
      "Pfandbriefrendite, zu der die Bank das zurückgezahlte Kapital wiederanlegen kann. Differenz zum Vertragszins = Zinsschaden. Quelle: bundesbank.de / fmh.de.",
    tipBearbeitung:
      "Pauschale der Bank für die Bearbeitung der vorzeitigen Ablösung. Üblich 150–300 €.",
  },
  en: {
    secEck: "Loan key data",
    secKuend: "Cancellation & market data",
    lAuszahlung: "Disbursement date",
    lZbEnde: "End of fixed-rate period",
    lRestschuld: "Current remaining debt",
    lRestschuldDatum: "Date of remaining debt",
    lNominalzins: "Nominal rate p.a.",
    lRate: "Monthly payment",
    lKuendigung: "Planned cancellation date",
    lSonderJ: "Annual extra repayment",
    lSonderGeleistet: "Extra repayment made this year?",
    lWiederanlage: "Reinvestment rate (Pfandbrief) p.a.",
    lBearbeitung: "Bank processing fee",
    hintFin: "↩ Loan calculator",
    hintCalc: "↩ calculated",
    hintPfand: "Current Pfandbrief yields: bundesbank.de or fmh.de",
    yes: "Yes",
    no: "No",
    toResult: "Result →",
    emptyTitle: "Fill in the fields to calculate the penalty",
    emptyMin:
      "At least: disbursement date, end of fixed-rate period, remaining debt, cancellation date, reinvestment rate",
    freeTitle: "✅ Free cancellation possible (§ 489 BGB)",
    freeBodyA: "Under § 489 BGB this loan can be cancelled free of charge from {date}.",
    freeBodyB: "(10 years + 6 months grace period after disbursement)",
    resOverview: "Result overview",
    rZins: "Interest deterioration loss",
    rRisiko: "Risk saving (0.1 pp p.a.)",
    rVerw: "Administration saving (€4/booking)",
    rBearb: "Bank processing fee",
    rNetto: "Net prepayment penalty",
    negNote:
      "ℹ️ Negative penalty: the bank profits from early repayment (current reinvestment rate {wa}% > contract rate {zp}%). Banks are nevertheless not obliged to refund (no corresponding BGH ruling).",
    explainPosTitle: "💸 What does this mean for you?",
    explainPos:
      "In short: if you repay your loan early, you must pay this amount to your bank — the prepayment penalty. It is a fee for exiting the contract before the agreed end date.\n\nWhy does the bank charge this? It had counted on receiving your interest payments until the end of the fixed-rate period. Early repayment cuts off those earnings — and the bank passes that loss on to you.\n\nWhether refinancing makes sense despite the penalty depends on your new interest rate. If current rates are significantly lower than your contract rate, it may still be worth it.",
    explainNegTitle: "🤔 What does this mean for you?",
    explainNeg:
      "The result is negative — sounds good at first, but unfortunately it does not mean the bank owes you money.\n\nWhat is going on? The bank could reinvest the repaid capital at a higher rate than you are paying. Mathematically, early repayment actually benefits the bank — it suffers no loss.\n\nThere is currently no BGH ruling requiring the bank to refund anything in this situation. You can still repay early without the bank demanding a penalty — but raise this directly with your bank and ask for their detailed calculation.",
    planTitle: "📊 Amortization plan from cancellation",
    planOpen: "▼ open",
    planClose: "▲ close",
    planMonths: "months",
    thJahr: "Year",
    thRest: "Remaining debt",
    thTilg: "Repayment",
    thZinsOrig: "Interest orig.",
    thZinsWA: "Interest reinv.",
    thZinsverlust: "Interest loss",
    thAbgezinst: "Discounted",
    sum: "Total",
    disclaimer:
      "⚖️ Calculation per BGH ruling AZ: XI ZR 285/03 (asset-liability method, Pfandbrief rates). Guidance calculator – does not replace the bank's calculation. No legal advice.",
    phRestschuld: "e.g. 350000",
    cap489:
      "§ 489 BGB: loss calculated only until {date} — from that day free cancellation would be possible (10 years + 6 months grace period after disbursement). The period beyond this date is not counted.",
    tipAuszahlung:
      "Date the loan was fully disbursed. Decisive for the § 489 deadline (10 years + 6 months grace period).",
    tipZbEnde:
      "End of the agreed fixed-rate period. The bank incurs an interest loss on early repayment up to this date.",
    tipRestschuld: "Current loan balance per the bank as of the reference date below.",
    tipRestschuldDatum:
      "Reference date the entered remaining debt refers to. Calculation runs from here to the cancellation date.",
    tipNominalzins:
      "Contractual nominal rate p.a. (not effective rate). Taken automatically from the loan calculator if set there.",
    tipRate:
      "Current monthly annuity (interest + repayment). Estimated from the loan calculator if left empty.",
    tipKuendigung:
      "Planned date of early repayment. Must be after the remaining-debt reference date and before the end of the fixed-rate period.",
    tipSonderJ:
      "Contractually agreed annual extra repayment (§ 500 BGB). Reduces the remaining debt and thus the interest loss. 0 = none.",
    tipSonderGeleistet:
      "Has this year's extra repayment already been made? Yes = next extra repayment only next year. No = it is counted for the current year. Only relevant if an annual extra repayment > €0 is entered.",
    tipWiederanlage:
      "Pfandbrief yield at which the bank can reinvest the repaid capital. Difference to the contract rate = interest loss. Source: bundesbank.de / fmh.de.",
    tipBearbeitung: "Bank's flat fee for processing the early repayment. Typically €150–300.",
  },
  tr: {
    secEck: "Kredinin temel verileri",
    secKuend: "Fesih & piyasa verileri",
    lAuszahlung: "Ödeme tarihi",
    lZbEnde: "Sabit faiz dönemi sonu",
    lRestschuld: "Güncel kalan borç",
    lRestschuldDatum: "Kalan borç tarihi",
    lNominalzins: "Nominal faiz y.b.",
    lRate: "Aylık taksit",
    lKuendigung: "Planlanan fesih tarihi",
    lSonderJ: "Yıllık ek ödeme",
    lSonderGeleistet: "Bu yıl ek ödeme yapıldı mı?",
    lWiederanlage: "Yeniden yatırım faizi (Pfandbrief) y.b.",
    lBearbeitung: "Banka işlem ücreti",
    hintFin: "↩ Kredi hesaplayıcı",
    hintCalc: "↩ hesaplandı",
    hintPfand: "Güncel Pfandbrief getirileri: bundesbank.de veya fmh.de",
    yes: "Evet",
    no: "Hayır",
    toResult: "Sonuç →",
    emptyTitle: "Cezayı hesaplamak için alanları doldurun",
    emptyMin:
      "En az: ödeme tarihi, sabit faiz dönemi sonu, kalan borç, fesih tarihi, yeniden yatırım faizi",
    freeTitle: "✅ Ücretsiz fesih mümkün (§ 489 BGB)",
    freeBodyA: "§ 489 BGB uyarınca bu kredi {date} tarihinden itibaren ücretsiz feshedilebilir.",
    freeBodyB: "(Ödemeden sonra 10 yıl + 6 ay bekleme süresi)",
    resOverview: "Sonuç özeti",
    rZins: "Faiz kötüleşme zararı",
    rRisiko: "Risk tasarrufu (0,1 puan y.b.)",
    rVerw: "İdari tasarruf (4 €/işlem)",
    rBearb: "Banka işlem ücreti",
    rNetto: "Net erken ödeme cezası",
    negNote:
      "ℹ️ Negatif ceza: Banka erken geri ödemeden kâr eder (güncel yeniden yatırım faizi {wa}% > sözleşme faizi {zp}%). Yine de bankalar iadeyle yükümlü değildir (ilgili BGH kararı yok).",
    explainPosTitle: "💸 Bu sizin için ne anlama geliyor?",
    explainPos:
      "Kısaca: Kredinizi erken kapatırsanız bu tutarı bankanıza ödemek zorundasınız — erken ödeme cezasıdır.\n\nBanka bunu neden ister? Sabit faiz döneminin sonuna kadar faiz geliri almayı planlamıştı. Erken ödeyince bu gelir kaybolur ve banka bu kaybı sizden tahsil eder.\n\nYeni faiz oranınız sözleşme faizinizden belirgin şekilde düşükse, cezaya rağmen refinansman mantıklı olabilir.",
    explainNegTitle: "🤔 Bu sizin için ne anlama geliyor?",
    explainNeg:
      "Sonuç negatif — kulağa iyi geliyor ama maalesef bankanın size para ödeyeceği anlamına gelmiyor.\n\nNeden? Banka, geri ödenen parayı bugün daha yüksek faizle yatırıma dönüştürebilir. Erken ödeme bankaya zarar vermez, hatta kâr sağlar.\n\nBuna rağmen bankayı geri ödemeye zorlayan bir BGH kararı mevcut değil. Bankadan ayrıntılı hesap dökümü talep etmeniz önerilir.",
    planTitle: "📊 Fesihten itibaren itfa planı",
    planOpen: "▼ aç",
    planClose: "▲ kapat",
    planMonths: "ay",
    thJahr: "Yıl",
    thRest: "Kalan borç",
    thTilg: "İtfa",
    thZinsOrig: "Faiz orij.",
    thZinsWA: "Faiz yen.yat.",
    thZinsverlust: "Faiz kaybı",
    thAbgezinst: "İskontolu",
    sum: "Toplam",
    disclaimer:
      "⚖️ Hesaplama BGH kararı AZ: XI ZR 285/03'e göre (aktif-pasif yöntemi, Pfandbrief oranları). Yönlendirme hesaplayıcısı – bankanın hesaplamasının yerini tutmaz. Hukuki tavsiye değildir.",
    phRestschuld: "örn. 350000",
    cap489:
      "§ 489 BGB: zarar yalnızca {date} tarihine kadar hesaplandı — o günden itibaren ücretsiz fesih mümkün olurdu (ödemeden sonra 10 yıl + 6 ay bekleme süresi). Bu tarihten sonraki dönem dikkate alınmaz.",
    tipAuszahlung:
      "Kredinin tamamen ödendiği tarih. § 489 süresi için belirleyici (10 yıl + 6 ay bekleme süresi).",
    tipZbEnde:
      "Kararlaştırılan sabit faiz döneminin sonu. Bu tarihe kadar erken ödemede bankaya faiz zararı doğar.",
    tipRestschuld: "Aşağıdaki referans tarihinde bankaya göre güncel kredi bakiyesi.",
    tipRestschuldDatum:
      "Girilen kalan borcun ait olduğu referans tarihi. Hesaplama buradan fesih tarihine kadar yürür.",
    tipNominalzins:
      "Sözleşmesel nominal faiz y.b. (efektif faiz değil). Orada ayarlanmışsa kredi hesaplayıcıdan otomatik alınır.",
    tipRate:
      "Güncel aylık anüite (faiz + itfa). Boş bırakılırsa kredi hesaplayıcıdan tahmin edilir.",
    tipKuendigung:
      "Planlanan erken ödeme tarihi. Kalan borç referans tarihinden sonra ve sabit faiz dönemi sonundan önce olmalıdır.",
    tipSonderJ:
      "Sözleşmeyle kararlaştırılan yıllık ek ödeme (§ 500 BGB). Kalan borcu ve dolayısıyla faiz zararını azaltır. 0 = yok.",
    tipSonderGeleistet:
      "Bu yılki ek ödeme yapıldı mı? Evet = bir sonraki ek ödeme ancak gelecek yıl. Hayır = içinde bulunulan yıl için sayılır. Yalnızca yıllık ek ödeme > 0 € girilmişse geçerlidir.",
    tipWiederanlage:
      "Bankanın geri ödenen sermayeyi yeniden yatırabileceği Pfandbrief getirisi. Sözleşme faiziyle fark = faiz kaybı. Kaynak: bundesbank.de / fmh.de.",
    tipBearbeitung: "Bankanın erken ödeme işlemi için sabit ücreti. Genellikle 150–300 €.",
  },
  zh: {
    secEck: "贷款基本数据",
    secKuend: "解约与市场数据",
    lAuszahlung: "放款日期",
    lZbEnde: "固定利率期结束",
    lRestschuld: "当前剩余债务",
    lRestschuldDatum: "剩余债务日期",
    lNominalzins: "年标定利率",
    lRate: "月供",
    lKuendigung: "计划解约日期",
    lSonderJ: "年度额外还款",
    lSonderGeleistet: "今年是否已额外还款？",
    lWiederanlage: "再投资利率（Pfandbrief）年",
    lBearbeitung: "银行手续费",
    hintFin: "↩ 贷款计算器",
    hintCalc: "↩ 已计算",
    hintPfand: "当前 Pfandbrief 收益率：bundesbank.de 或 fmh.de",
    yes: "是",
    no: "否",
    toResult: "结果 →",
    emptyTitle: "填写字段以计算罚金",
    emptyMin: "至少：放款日期、固定利率期结束、剩余债务、解约日期、再投资利率",
    freeTitle: "✅ 可免费解约（§ 489 BGB）",
    freeBodyA: "根据 § 489 BGB，本贷款自 {date} 起可免费解约。",
    freeBodyB: "（放款后 10 年 + 6 个月宽限期）",
    resOverview: "结果概览",
    rZins: "利息恶化损失",
    rRisiko: "风险节省（每年 0.1 个百分点）",
    rVerw: "管理费节省（每笔 4 €）",
    rBearb: "银行手续费",
    rNetto: "净提前还款罚金",
    negNote:
      "ℹ️ 负罚金：银行从提前还款中获益（当前再投资利率 {wa}% > 合同利率 {zp}%）。但银行仍无退款义务（无相应 BGH 判决）。",
    explainPosTitle: "💸 这对您意味着什么？",
    explainPos:
      "简而言之：提前还清贷款需向银行支付此金额，即提前还款罚金。\n\n为什么？银行原本计划收取固定利率期内全部利息，提前还款使这些收入消失，银行通过罚金弥补损失。\n\n如果当前市场利率明显低于合同利率，即使支付罚金，再融资也可能更划算。",
    explainNegTitle: "🤔 这对您意味着什么？",
    explainNeg:
      "结果为负值——听起来不错，但很遗憾并不意味着银行会退钱。\n\n原因：银行可将您归还的资金以高于合同利率的收益再投资，提前还款对银行实际上有利可图。\n\n目前没有BGH判决要求银行在此情况下退款。建议直接与银行沟通并索取详细计算清单。",
    planTitle: "📊 解约起的摊销计划",
    planOpen: "▼ 展开",
    planClose: "▲ 收起",
    planMonths: "个月",
    thJahr: "年份",
    thRest: "剩余债务",
    thTilg: "还本",
    thZinsOrig: "原利息",
    thZinsWA: "再投资利息",
    thZinsverlust: "利息损失",
    thAbgezinst: "折现",
    sum: "合计",
    disclaimer:
      "⚖️ 依据 BGH 判决 AZ: XI ZR 285/03 计算（资产负债法、Pfandbrief 利率）。仅供参考——不能替代银行的计算。非法律建议。",
    phRestschuld: "例如 350000",
    cap489:
      "§ 489 BGB：损失仅计算至 {date}——自该日起可免费解约（放款后 10 年 + 6 个月宽限期）。此日期之后的期间不予计入。",
    tipAuszahlung: "贷款全额放款的日期。对 § 489 期限具有决定性（10 年 + 6 个月宽限期）。",
    tipZbEnde: "约定固定利率期的结束。在此日期前提前还款会给银行造成利息损失。",
    tipRestschuld: "银行在下方参考日期的当前贷款余额。",
    tipRestschuldDatum: "所输入剩余债务对应的参考日期。计算从此处推算至解约日期。",
    tipNominalzins: "合同年标定利率（非实际利率）。若在贷款计算器中已设置则自动采用。",
    tipRate: "当前月供年金（利息 + 还本）。若留空则由贷款计算器估算。",
    tipKuendigung: "计划的提前还款日期。必须晚于剩余债务参考日期、早于固定利率期结束。",
    tipSonderJ: "合同约定的年度额外还款（§ 500 BGB）。减少剩余债务从而减少利息损失。0 = 无。",
    tipSonderGeleistet:
      "今年的额外还款是否已完成？是 = 下次额外还款在明年。否 = 计入当年。仅当填入年度额外还款 > 0 € 时相关。",
    tipWiederanlage:
      "银行可将所还本金再投资的 Pfandbrief 收益率。与合同利率之差 = 利息损失。来源：bundesbank.de / fmh.de。",
    tipBearbeitung: "银行办理提前还款的固定费用。通常 150–300 €。",
  },
  hi: {
    secEck: "ऋण के मुख्य आंकड़े",
    secKuend: "रद्दीकरण और बाज़ार डेटा",
    lAuszahlung: "वितरण तिथि",
    lZbEnde: "निश्चित दर अवधि का अंत",
    lRestschuld: "वर्तमान शेष ऋण",
    lRestschuldDatum: "शेष ऋण की तिथि",
    lNominalzins: "नाममात्र दर प्रति वर्ष",
    lRate: "मासिक किस्त",
    lKuendigung: "नियोजित रद्दीकरण तिथि",
    lSonderJ: "वार्षिक अतिरिक्त भुगतान",
    lSonderGeleistet: "इस वर्ष अतिरिक्त भुगतान किया?",
    lWiederanlage: "पुनर्निवेश दर (Pfandbrief) प्र.व.",
    lBearbeitung: "बैंक प्रसंस्करण शुल्क",
    hintFin: "↩ ऋण कैलकुलेटर",
    hintCalc: "↩ गणना की गई",
    hintPfand: "वर्तमान Pfandbrief प्रतिफल: bundesbank.de या fmh.de",
    yes: "हाँ",
    no: "नहीं",
    toResult: "परिणाम →",
    emptyTitle: "शुल्क की गणना हेतु फ़ील्ड भरें",
    emptyMin: "न्यूनतम: वितरण तिथि, निश्चित दर अवधि का अंत, शेष ऋण, रद्दीकरण तिथि, पुनर्निवेश दर",
    freeTitle: "✅ निःशुल्क रद्दीकरण संभव (§ 489 BGB)",
    freeBodyA: "§ 489 BGB के अनुसार यह ऋण {date} से निःशुल्क रद्द किया जा सकता है।",
    freeBodyB: "(वितरण के बाद 10 वर्ष + 6 माह की रियायत अवधि)",
    resOverview: "परिणाम अवलोकन",
    rZins: "ब्याज गिरावट हानि",
    rRisiko: "जोखिम बचत (0.1 अंक प्र.व.)",
    rVerw: "प्रशासनिक बचत (4 €/प्रविष्टि)",
    rBearb: "बैंक प्रसंस्करण शुल्क",
    rNetto: "शुद्ध अग्रिम भुगतान शुल्क",
    negNote:
      "ℹ️ ऋणात्मक शुल्क: बैंक को समय-पूर्व अदायगी से लाभ होता है (वर्तमान पुनर्निवेश दर {wa}% > अनुबंध दर {zp}%)। फिर भी बैंक वापसी हेतु बाध्य नहीं हैं (कोई संगत BGH निर्णय नहीं)।",
    explainPosTitle: "💸 आपके लिए इसका क्या अर्थ है?",
    explainPos:
      "सीधे शब्दों में: यदि आप अभी ऋण जल्दी चुकाते हैं तो यह राशि बैंक को देनी होगी — अग्रिम भुगतान शुल्क।\n\nबैंक यह क्यों लेता है? उसने निश्चित ब्याज अवधि तक ब्याज आय की योजना बनाई थी। समय-पूर्व चुकौती से यह आय समाप्त हो जाती है।\n\nयदि वर्तमान बाजार दर आपकी अनुबंध दर से काफी कम है तो शुल्क के बावजूद पुनर्वित्त लाभदायक हो सकता है।",
    explainNegTitle: "🤔 आपके लिए इसका क्या अर्थ है?",
    explainNeg:
      "परिणाम ऋणात्मक है — यह अच्छा लगता है लेकिन इसका मतलब यह नहीं कि बैंक आपको पैसे देगा।\n\nक्यों? बैंक वापस की गई राशि को आपकी ऋण दर से अधिक ब्याज पर निवेश कर सकता है — समय-पूर्व चुकौती वास्तव में बैंक के लिए लाभदायक है।\n\nकोई BGH निर्णय नहीं है जो बैंक को वापसी के लिए बाध्य करे। अपने बैंक से सीधे बात करें और विस्तृत गणना माँगें।",
    planTitle: "📊 रद्दीकरण से परिशोधन योजना",
    planOpen: "▼ खोलें",
    planClose: "▲ बंद करें",
    planMonths: "माह",
    thJahr: "वर्ष",
    thRest: "शेष ऋण",
    thTilg: "चुकौती",
    thZinsOrig: "मूल ब्याज",
    thZinsWA: "पुनर्निवेश ब्याज",
    thZinsverlust: "ब्याज हानि",
    thAbgezinst: "छूट दी गई",
    sum: "कुल",
    disclaimer:
      "⚖️ गणना BGH निर्णय AZ: XI ZR 285/03 के अनुसार (परिसंपत्ति-देयता विधि, Pfandbrief दरें)। मार्गदर्शन कैलकुलेटर – बैंक की गणना का स्थान नहीं लेता। कोई कानूनी सलाह नहीं।",
    phRestschuld: "उदा. 350000",
    cap489:
      "§ 489 BGB: हानि केवल {date} तक गणना की गई — उस दिन से निःशुल्क रद्दीकरण संभव होगा (वितरण के बाद 10 वर्ष + 6 माह रियायत अवधि)। इस तिथि के बाद की अवधि गणना में नहीं ली जाती।",
    tipAuszahlung:
      "वह तिथि जब ऋण पूर्णतः वितरित हुआ। § 489 समय-सीमा हेतु निर्णायक (10 वर्ष + 6 माह रियायत)।",
    tipZbEnde:
      "सहमत निश्चित दर अवधि का अंत। इस तिथि तक समय-पूर्व अदायगी पर बैंक को ब्याज हानि होती है।",
    tipRestschuld: "नीचे दी गई संदर्भ तिथि पर बैंक के अनुसार वर्तमान ऋण शेष।",
    tipRestschuldDatum:
      "दर्ज शेष ऋण जिस संदर्भ तिथि से संबंधित है। गणना यहाँ से रद्दीकरण तिथि तक चलती है।",
    tipNominalzins:
      "अनुबंधगत नाममात्र दर प्र.व. (प्रभावी दर नहीं)। यदि ऋण कैलकुलेटर में सेट हो तो स्वतः लिया जाता है।",
    tipRate: "वर्तमान मासिक वार्षिकी (ब्याज + चुकौती)। खाली होने पर ऋण कैलकुलेटर से अनुमानित।",
    tipKuendigung:
      "समय-पूर्व अदायगी की नियोजित तिथि। शेष-ऋण संदर्भ तिथि के बाद और निश्चित दर अवधि के अंत से पहले होनी चाहिए।",
    tipSonderJ:
      "अनुबंध में तय वार्षिक अतिरिक्त भुगतान (§ 500 BGB)। शेष ऋण और इस प्रकार ब्याज हानि घटाता है। 0 = कोई नहीं।",
    tipSonderGeleistet:
      "इस वर्ष का अतिरिक्त भुगतान हो चुका? हाँ = अगला अतिरिक्त भुगतान अगले वर्ष। नहीं = चालू वर्ष हेतु गिना जाता है। केवल तब प्रासंगिक जब वार्षिक अतिरिक्त भुगतान > 0 € दर्ज हो।",
    tipWiederanlage:
      "वह Pfandbrief प्रतिफल जिस पर बैंक चुकाई गई पूंजी पुनर्निवेश कर सकता है। अनुबंध दर से अंतर = ब्याज हानि। स्रोत: bundesbank.de / fmh.de।",
    tipBearbeitung:
      "समय-पूर्व अदायगी के प्रसंस्करण हेतु बैंक का निश्चित शुल्क। सामान्यतः 150–300 €।",
  },
};
