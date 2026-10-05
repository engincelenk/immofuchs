/* Oeffentliche Seiten ohne Anmeldung: Kuendigung (§ 312k BGB), Widerruf (§ 356a BGB), Kontakt.
   Eine Datei fuer alle drei Seiten (kuendigen.html, widerruf.html, kontakt.html): Sprache aus
   localStorage "if_lang" wie in der App, Texte in 5 Sprachen. Nutzereingaben werden nie als HTML
   eingesetzt (nur textContent). */
(function () {
  "use strict";

  var LANGS = { de: "Deutsch", en: "English", tr: "Türkçe", zh: "中文", hi: "हिन्दी" };

  var I = {
    de: {
      back: "← Zurück zu ImmoFuchs",
      language: "Sprache",
      fImpressum: "Impressum (DE)",
      fDatenschutz: "Datenschutz (DE)",
      fAgb: "AGB (DE)",
      fCancel: "Verträge hier kündigen",
      fWithdraw: "Vertrag widerrufen",
      fContact: "Kontakt",
      emailContact: "Deine E-Mail-Adresse",
      email: "E-Mail-Adresse deines Kontos",
      name: "Name",
      optional: "optional",
      sending: "Wird gesendet …",
      errEmail: "Bitte gib eine gültige E-Mail-Adresse ein.",
      errName: "Bitte gib deinen Namen an.",
      errRate: "Zu viele Versuche. Bitte warte eine Stunde oder schreibe uns über das Kontaktformular.",
      errGeneric: "Das hat leider nicht geklappt. Bitte versuche es später noch einmal oder nutze das Kontaktformular.",
      cancel: {
        title: "Verträge hier kündigen",
        intro: "Hier kannst du dein ImmoFuchs-Pro-Abonnement ohne Anmeldung kündigen. Prüfe die Angaben und bestätige mit „Jetzt kündigen“.",
        kArt: "Art der Kündigung",
        vArt: "Ordentliche Kündigung des Abonnements",
        kVertrag: "Vertrag",
        vVertrag: "ImmoFuchs Pro (Abonnement), zugeordnet über die E-Mail-Adresse deines Kontos",
        kZeit: "Der Vertrag endet",
        vZeit: "zum Ende der laufenden Abrechnungsperiode (nächstmöglicher Zeitpunkt); bis dahin bleibt Pro aktiv",
        kBest: "Bestätigung",
        vBest: "per E-Mail an die unten angegebene Adresse, sofort nach dem Absenden",
        button: "Jetzt kündigen",
        okTitle: "Kündigung eingegangen",
        okReceived: "Zugang deiner Kündigung: {t}",
        okNote: "Wenn zu dieser E-Mail-Adresse ein Vertrag besteht, haben wir die Kündigung vorgemerkt und senden dir die Bestätigung mit dem Ende des Vertrags per E-Mail. Kommt innerhalb weniger Minuten keine Mail an, prüfe die Schreibweise der Adresse oder nutze das Kontaktformular."
      },
      withdraw: {
        title: "Vertrag widerrufen",
        intro: "Du kannst deinen Vertrag innerhalb von 14 Tagen ab Vertragsschluss ohne Angabe von Gründen widerrufen. Für die bis zum Widerruf erbrachte Leistung berechnen wir anteiligen Wertersatz (siehe AGB, Ziffer 7); der Rest wird auf dein Zahlungsmittel erstattet.",
        kVertrag: "Vertrag",
        vVertrag: "ImmoFuchs Pro (Abonnement), zugeordnet über die E-Mail-Adresse deines Kontos",
        kBest: "Eingangsbestätigung",
        vBest: "per E-Mail an die unten angegebene Adresse, sofort nach dem Absenden",
        button: "Widerruf bestätigen",
        okTitle: "Widerruf eingegangen",
        okReceived: "Eingang deines Widerrufs: {t}",
        okNote: "Wenn zu dieser E-Mail-Adresse ein Vertrag besteht, bestätigen wir dir den Eingang per E-Mail. Diese Mail bestätigt nur den Eingang; danach prüfen wir den Widerruf und veranlassen die Erstattung. Kommt innerhalb weniger Minuten keine Mail an, prüfe die Schreibweise der Adresse oder nutze das Kontaktformular."
      },
      contact: {
        title: "Kontakt",
        intro: "Schreib uns – wir antworten per E-Mail.",
        message: "Deine Nachricht",
        button: "Nachricht senden",
        okTitle: "Nachricht gesendet",
        okNote: "Danke! Wir melden uns so bald wie möglich per E-Mail bei dir.",
        privacy: "Wir verwenden deinen Namen, deine E-Mail-Adresse und deine Nachricht nur, um deine Anfrage zu beantworten. Details in der",
        privacyLink: "Datenschutzerklärung (DE)",
        errMessage: "Bitte schreibe mindestens 10 Zeichen."
      }
    },
    en: {
      back: "← Back to ImmoFuchs",
      language: "Language",
      fImpressum: "Legal notice (DE)",
      fDatenschutz: "Privacy (DE)",
      fAgb: "Terms (DE)",
      fCancel: "Cancel contracts here",
      fWithdraw: "Withdraw from contract",
      fContact: "Contact",
      emailContact: "Your email address",
      email: "Email address of your account",
      name: "Name",
      optional: "optional",
      sending: "Sending …",
      errEmail: "Please enter a valid email address.",
      errName: "Please enter your name.",
      errRate: "Too many attempts. Please wait an hour or write to us via the contact form.",
      errGeneric: "That did not work. Please try again later or use the contact form.",
      cancel: {
        title: "Cancel contracts here",
        intro: "Here you can cancel your ImmoFuchs Pro subscription without logging in. Check the details and confirm with “Cancel now”.",
        kArt: "Type of cancellation",
        vArt: "Ordinary cancellation of the subscription",
        kVertrag: "Contract",
        vVertrag: "ImmoFuchs Pro (subscription), identified by the email address of your account",
        kZeit: "The contract ends",
        vZeit: "at the end of the current billing period (earliest possible date); Pro stays active until then",
        kBest: "Confirmation",
        vBest: "by email to the address entered below, immediately after submitting",
        button: "Cancel now",
        okTitle: "Cancellation received",
        okReceived: "Your cancellation was received: {t}",
        okNote: "If a contract exists for this email address, we have noted the cancellation and will send you the confirmation with the end date by email. If no email arrives within a few minutes, check the spelling of the address or use the contact form."
      },
      withdraw: {
        title: "Withdraw from contract",
        intro: "You can withdraw from your contract within 14 days of concluding it without giving a reason. For the service provided until the withdrawal we charge a proportionate compensation (see Terms, section 7); the rest is refunded to your payment method.",
        kVertrag: "Contract",
        vVertrag: "ImmoFuchs Pro (subscription), identified by the email address of your account",
        kBest: "Confirmation of receipt",
        vBest: "by email to the address entered below, immediately after submitting",
        button: "Confirm withdrawal",
        okTitle: "Withdrawal received",
        okReceived: "Your withdrawal was received: {t}",
        okNote: "If a contract exists for this email address, we confirm receipt by email. That email only confirms receipt; afterwards we review the withdrawal and arrange the refund. If no email arrives within a few minutes, check the spelling of the address or use the contact form."
      },
      contact: {
        title: "Contact",
        intro: "Write to us – we reply by email.",
        message: "Your message",
        button: "Send message",
        okTitle: "Message sent",
        okNote: "Thank you! We will get back to you by email as soon as possible.",
        privacy: "We use your name, email address and message only to answer your request. Details in the",
        privacyLink: "privacy policy (DE)",
        errMessage: "Please write at least 10 characters."
      }
    },
    tr: {
      back: "← ImmoFuchs'a dön",
      language: "Dil",
      fImpressum: "Yasal bilgiler (DE)",
      fDatenschutz: "Gizlilik (DE)",
      fAgb: "Şartlar (DE)",
      fCancel: "Sözleşmeleri buradan iptal et",
      fWithdraw: "Sözleşmeden cay",
      fContact: "İletişim",
      emailContact: "E-posta adresin",
      email: "Hesabının e-posta adresi",
      name: "Ad",
      optional: "isteğe bağlı",
      sending: "Gönderiliyor …",
      errEmail: "Lütfen geçerli bir e-posta adresi gir.",
      errName: "Lütfen adını yaz.",
      errRate: "Çok fazla deneme. Lütfen bir saat bekle veya iletişim formundan bize yaz.",
      errGeneric: "Bu işlem olmadı. Lütfen daha sonra tekrar dene veya iletişim formunu kullan.",
      cancel: {
        title: "Sözleşmeleri buradan iptal et",
        intro: "Burada ImmoFuchs Pro aboneliğini giriş yapmadan iptal edebilirsin. Bilgileri kontrol et ve “Şimdi iptal et” ile onayla.",
        kArt: "İptal türü",
        vArt: "Aboneliğin olağan iptali",
        kVertrag: "Sözleşme",
        vVertrag: "ImmoFuchs Pro (abonelik), hesabının e-posta adresiyle eşleştirilir",
        kZeit: "Sözleşme sona erer",
        vZeit: "mevcut faturalama döneminin sonunda (mümkün olan en erken tarih); o zamana kadar Pro aktif kalır",
        kBest: "Onay",
        vBest: "gönderdikten hemen sonra aşağıda yazdığın adrese e-postayla",
        button: "Şimdi iptal et",
        okTitle: "İptal alındı",
        okReceived: "İptalin şu tarihte alındı: {t}",
        okNote: "Bu e-posta adresine ait bir sözleşme varsa iptali not aldık ve sözleşmenin bitiş tarihini içeren onayı e-postayla göndereceğiz. Birkaç dakika içinde e-posta gelmezse adresin yazımını kontrol et veya iletişim formunu kullan."
      },
      withdraw: {
        title: "Sözleşmeden cay",
        intro: "Sözleşmeden, kuruluşundan itibaren 14 gün içinde gerekçe göstermeden cayabilirsin. Cayma anına kadar sunulan hizmet için orantılı bir bedel hesaplarız (bkz. Şartlar, madde 7); kalanı ödeme yöntemine iade edilir.",
        kVertrag: "Sözleşme",
        vVertrag: "ImmoFuchs Pro (abonelik), hesabının e-posta adresiyle eşleştirilir",
        kBest: "Alındı onayı",
        vBest: "gönderdikten hemen sonra aşağıda yazdığın adrese e-postayla",
        button: "Cayma beyanını onayla",
        okTitle: "Cayma alındı",
        okReceived: "Caymanın alındığı zaman: {t}",
        okNote: "Bu e-posta adresine ait bir sözleşme varsa alındığını e-postayla onaylarız. Bu e-posta yalnızca alındığını onaylar; ardından caymayı inceler ve iadeyi başlatırız. Birkaç dakika içinde e-posta gelmezse adresin yazımını kontrol et veya iletişim formunu kullan."
      },
      contact: {
        title: "İletişim",
        intro: "Bize yaz – e-postayla yanıtlarız.",
        message: "Mesajın",
        button: "Mesajı gönder",
        okTitle: "Mesaj gönderildi",
        okNote: "Teşekkürler! En kısa sürede e-postayla dönüş yapacağız.",
        privacy: "Adını, e-posta adresini ve mesajını yalnızca talebini yanıtlamak için kullanırız. Ayrıntılar:",
        privacyLink: "gizlilik bildirimi (DE)",
        errMessage: "Lütfen en az 10 karakter yaz."
      }
    },
    zh: {
      back: "← 返回 ImmoFuchs",
      language: "语言",
      fImpressum: "法律声明（德语）",
      fDatenschutz: "隐私政策（德语）",
      fAgb: "条款（德语）",
      fCancel: "在此取消合同",
      fWithdraw: "撤销合同",
      fContact: "联系我们",
      emailContact: "你的电子邮箱",
      email: "你的账户电子邮箱",
      name: "姓名",
      optional: "可选",
      sending: "正在发送 …",
      errEmail: "请输入有效的电子邮箱地址。",
      errName: "请填写你的姓名。",
      errRate: "尝试次数过多。请等待一小时，或通过联系表单写信给我们。",
      errGeneric: "操作未成功。请稍后再试或使用联系表单。",
      cancel: {
        title: "在此取消合同",
        intro: "你可以在此无需登录即可取消 ImmoFuchs Pro 订阅。请核对信息，并点击“立即取消”确认。",
        kArt: "取消类型",
        vArt: "订阅的正常取消",
        kVertrag: "合同",
        vVertrag: "ImmoFuchs Pro（订阅），通过你账户的电子邮箱识别",
        kZeit: "合同终止时间",
        vZeit: "当前计费周期结束时（最早可能的时间）；在此之前 Pro 保持有效",
        kBest: "确认",
        vBest: "提交后立即通过电子邮件发送到下方填写的地址",
        button: "立即取消",
        okTitle: "已收到取消申请",
        okReceived: "你的取消申请送达时间：{t}",
        okNote: "如果该电子邮箱对应有合同，我们已记录取消，并会通过电子邮件发送含合同结束日期的确认。如果几分钟内没有收到邮件，请检查地址拼写或使用联系表单。"
      },
      withdraw: {
        title: "撤销合同",
        intro: "你可以在合同成立后 14 天内无需说明理由撤销合同。对撤销前已提供的服务，我们按比例收取使用补偿（见条款第 7 条）；其余部分退还到你的支付方式。",
        kVertrag: "合同",
        vVertrag: "ImmoFuchs Pro（订阅），通过你账户的电子邮箱识别",
        kBest: "收到确认",
        vBest: "提交后立即通过电子邮件发送到下方填写的地址",
        button: "确认撤销",
        okTitle: "已收到撤销",
        okReceived: "你的撤销送达时间：{t}",
        okNote: "如果该电子邮箱对应有合同，我们会通过电子邮件确认收到。该邮件仅确认已收到；之后我们会审核撤销并办理退款。如果几分钟内没有收到邮件，请检查地址拼写或使用联系表单。"
      },
      contact: {
        title: "联系我们",
        intro: "给我们写信——我们会通过电子邮件回复。",
        message: "你的留言",
        button: "发送留言",
        okTitle: "留言已发送",
        okNote: "谢谢！我们会尽快通过电子邮件回复你。",
        privacy: "我们仅为答复你的请求而使用你的姓名、电子邮箱和留言。详情见",
        privacyLink: "隐私政策（德语）",
        errMessage: "请至少填写 10 个字符。"
      }
    },
    hi: {
      back: "← ImmoFuchs पर वापस",
      language: "भाषा",
      fImpressum: "कानूनी सूचना (DE)",
      fDatenschutz: "गोपनीयता (DE)",
      fAgb: "शर्तें (DE)",
      fCancel: "अनुबंध यहाँ रद्द करें",
      fWithdraw: "अनुबंध वापस लें",
      fContact: "संपर्क",
      emailContact: "आपका ईमेल पता",
      email: "आपके खाते का ईमेल पता",
      name: "नाम",
      optional: "वैकल्पिक",
      sending: "भेजा जा रहा है …",
      errEmail: "कृपया एक मान्य ईमेल पता दर्ज करें।",
      errName: "कृपया अपना नाम लिखें।",
      errRate: "बहुत अधिक प्रयास। कृपया एक घंटा प्रतीक्षा करें या संपर्क फ़ॉर्म से हमें लिखें।",
      errGeneric: "यह नहीं हो सका। कृपया बाद में फिर कोशिश करें या संपर्क फ़ॉर्म का उपयोग करें।",
      cancel: {
        title: "अनुबंध यहाँ रद्द करें",
        intro: "यहाँ आप लॉग इन किए बिना अपनी ImmoFuchs Pro सदस्यता रद्द कर सकते हैं। जानकारी जाँचें और “अभी रद्द करें” से पुष्टि करें।",
        kArt: "रद्द करने का प्रकार",
        vArt: "सदस्यता का सामान्य रद्दीकरण",
        kVertrag: "अनुबंध",
        vVertrag: "ImmoFuchs Pro (सदस्यता), आपके खाते के ईमेल पते से पहचाना जाता है",
        kZeit: "अनुबंध समाप्त होता है",
        vZeit: "वर्तमान बिलिंग अवधि के अंत में (सबसे जल्दी संभव तिथि); तब तक Pro सक्रिय रहता है",
        kBest: "पुष्टि",
        vBest: "भेजने के तुरंत बाद नीचे दिए पते पर ईमेल से",
        button: "अभी रद्द करें",
        okTitle: "रद्दीकरण प्राप्त हुआ",
        okReceived: "आपका रद्दीकरण प्राप्त हुआ: {t}",
        okNote: "यदि इस ईमेल पते पर कोई अनुबंध है, तो हमने रद्दीकरण दर्ज कर लिया है और अनुबंध की समाप्ति तिथि के साथ पुष्टि ईमेल से भेजेंगे। कुछ मिनट में ईमेल न आए तो पते की वर्तनी जाँचें या संपर्क फ़ॉर्म का उपयोग करें।"
      },
      withdraw: {
        title: "अनुबंध वापस लें",
        intro: "आप अनुबंध होने के 14 दिन के भीतर बिना कारण बताए उसे वापस ले सकते हैं। वापसी तक दी गई सेवा के लिए हम आनुपातिक मूल्य लेते हैं (देखें शर्तें, खंड 7); शेष राशि आपके भुगतान माध्यम में लौटाई जाती है।",
        kVertrag: "अनुबंध",
        vVertrag: "ImmoFuchs Pro (सदस्यता), आपके खाते के ईमेल पते से पहचाना जाता है",
        kBest: "प्राप्ति की पुष्टि",
        vBest: "भेजने के तुरंत बाद नीचे दिए पते पर ईमेल से",
        button: "वापसी की पुष्टि करें",
        okTitle: "वापसी प्राप्त हुई",
        okReceived: "आपकी वापसी प्राप्त हुई: {t}",
        okNote: "यदि इस ईमेल पते पर कोई अनुबंध है, तो हम प्राप्ति की पुष्टि ईमेल से करेंगे। वह ईमेल केवल प्राप्ति की पुष्टि करता है; उसके बाद हम वापसी की जाँच करके राशि लौटाने की प्रक्रिया शुरू करते हैं। कुछ मिनट में ईमेल न आए तो पते की वर्तनी जाँचें या संपर्क फ़ॉर्म का उपयोग करें।"
      },
      contact: {
        title: "संपर्क",
        intro: "हमें लिखें – हम ईमेल से जवाब देंगे।",
        message: "आपका संदेश",
        button: "संदेश भेजें",
        okTitle: "संदेश भेजा गया",
        okNote: "धन्यवाद! हम जल्द से जल्द ईमेल से आपसे संपर्क करेंगे।",
        privacy: "हम आपका नाम, ईमेल पता और संदेश केवल आपके अनुरोध का उत्तर देने के लिए उपयोग करते हैं। विवरण",
        privacyLink: "गोपनीयता नीति (DE) में",
        errMessage: "कृपया कम से कम 10 अक्षर लिखें।"
      }
    }
  };

  function storedLang() {
    try {
      var v = localStorage.getItem("if_lang");
      if (v && LANGS[v]) return v;
    } catch (e) {}
    var nav = (navigator.language || "de").slice(0, 2);
    return LANGS[nav] ? nav : "de";
  }

  var lang = storedLang();
  var API = (function () {
    var h = location.hostname;
    if (h === "localhost" || h === "127.0.0.1") return "http://localhost:8787";
    if (h === "dev.immofuchs.info") return "https://api-dev.immofuchs.info";
    if (h === "qa.immofuchs.info") return "https://immofuchs-assistant-qa.engincelenk.workers.dev";
    return "https://api.immofuchs.info";
  })();

  var seite = document.body.getAttribute("data-seite");
  var root = document.getElementById("app");

  function t(key) {
    var d = I[lang] || I.de;
    return d[key] != null ? d[key] : I.de[key];
  }
  function ts(key) {
    var d = (I[lang] || I.de)[seite];
    return d && d[key] != null ? d[key] : I.de[seite][key];
  }
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function field(id, label, opt, type, extra) {
    var wrap = document.createDocumentFragment();
    var l = el("label", { for: id }, label);
    if (opt) l.appendChild(el("span", { class: "opt" }, " (" + opt + ")"));
    wrap.appendChild(l);
    var input = el(type === "textarea" ? "textarea" : "input", { id: id, name: id });
    if (type !== "textarea") input.setAttribute("type", type || "text");
    if (extra) for (var k in extra) input.setAttribute(k, extra[k]);
    wrap.appendChild(input);
    return wrap;
  }
  function facts(rows) {
    var dl = el("dl", { class: "fact" });
    rows.forEach(function (r) {
      dl.appendChild(el("dt", null, r[0]));
      dl.appendChild(el("dd", null, r[1]));
    });
    return dl;
  }
  function msg(kind, title, body) {
    var d = el("div", { class: "msg " + kind, role: kind === "err" ? "alert" : "status" });
    if (title) d.appendChild(el("strong", null, title));
    if (body) {
      if (title) d.appendChild(el("br"));
      d.appendChild(document.createTextNode(body));
    }
    return d;
  }

  function render() {
    document.documentElement.lang = lang;
    document.title = ts("title") + " – ImmoFuchs";
    root.textContent = "";

    var top = el("div", { class: "top" });
    top.appendChild(el("a", { class: "back", href: "/" }, t("back")));
    var sel = el("select", { class: "lang", "aria-label": t("language") });
    Object.keys(LANGS).forEach(function (k) {
      var o = el("option", { value: k }, LANGS[k]);
      if (k === lang) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener("change", function () {
      lang = sel.value;
      try {
        localStorage.setItem("if_lang", lang);
      } catch (e) {}
      render();
    });
    top.appendChild(sel);
    root.appendChild(top);

    root.appendChild(el("h1", null, ts("title")));
    root.appendChild(el("p", null, ts("intro")));

    if (seite === "cancel") root.appendChild(formCancelWithdraw("cancel"));
    else if (seite === "withdraw") root.appendChild(formCancelWithdraw("withdraw"));
    else root.appendChild(formContact());

    var f = el("div", { class: "footer" });
    [
      ["/kuendigen.html", t("fCancel")],
      ["/widerruf.html", t("fWithdraw")],
      ["/kontakt.html", t("fContact")],
      ["/impressum.html", t("fImpressum")],
      ["/datenschutz.html", t("fDatenschutz")],
      ["/agb.html", t("fAgb")]
    ].forEach(function (l) {
      f.appendChild(el("a", { href: l[0] }, l[1]));
    });
    root.appendChild(f);
  }

  function post(path, body) {
    return fetch(API + "/api/v1/public" + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "omit",
      body: JSON.stringify(body)
    }).then(function (res) {
      return res
        .json()
        .catch(function () {
          return {};
        })
        .then(function (json) {
          return { status: res.status, json: json };
        });
    });
  }

  function fehlerText(r) {
    if (r.json && r.json.error === "invalid_email") return t("errEmail");
    if (r.json && r.json.error === "invalid_name") return t("errName");
    if (r.status === 429) return t("errRate");
    return t("errGeneric");
  }

  function formCancelWithdraw(art) {
    var form = el("form", { novalidate: "novalidate" });
    if (art === "cancel") {
      form.appendChild(
        facts([
          [ts("kArt"), ts("vArt")],
          [ts("kVertrag"), ts("vVertrag")],
          [ts("kZeit"), ts("vZeit")],
          [ts("kBest"), ts("vBest")]
        ])
      );
    } else {
      form.appendChild(
        facts([
          [ts("kVertrag"), ts("vVertrag")],
          [ts("kBest"), ts("vBest")]
        ])
      );
    }
    form.appendChild(field("name", t("name"), art === "cancel" ? t("optional") : null, "text", { autocomplete: "name", maxlength: "120" }));
    form.appendChild(field("email", t("email"), null, "email", { autocomplete: "email", inputmode: "email", maxlength: "254" }));
    var out = el("div");
    var btn = el("button", { type: "submit", class: "go" }, ts("button"));
    form.appendChild(out);
    form.appendChild(btn);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      out.textContent = "";
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return out.appendChild(msg("err", null, t("errEmail")));
      if (art === "withdraw" && name.length < 2) return out.appendChild(msg("err", null, t("errName")));
      btn.disabled = true;
      btn.textContent = t("sending");
      post(art === "cancel" ? "/cancel" : "/withdraw", { email: email, name: name }).then(
        function (r) {
          btn.textContent = ts("button");
          if (r.status === 200 && r.json && r.json.ok) {
            btn.style.display = "none";
            var box = msg("ok", ts("okTitle"), ts("okReceived").replace("{t}", r.json.receivedAt || ""));
            out.appendChild(box);
            out.appendChild(el("p", { class: "small" }, ts("okNote")));
          } else {
            btn.disabled = false;
            out.appendChild(msg("err", null, fehlerText(r)));
          }
        },
        function () {
          btn.disabled = false;
          btn.textContent = ts("button");
          out.appendChild(msg("err", null, t("errGeneric")));
        }
      );
    });
    return form;
  }

  function formContact() {
    var form = el("form", { novalidate: "novalidate" });
    form.appendChild(field("name", t("name"), null, "text", { autocomplete: "name", maxlength: "120" }));
    form.appendChild(field("email", t("emailContact"), null, "email", { autocomplete: "email", inputmode: "email", maxlength: "254" }));
    form.appendChild(field("message", ts("message"), null, "textarea", { maxlength: "4000" }));
    // Honeypot gegen Bots - Menschen sehen und fuellen das Feld nicht.
    var hp = el("div", { class: "hp", "aria-hidden": "true" });
    var hpIn = el("input", { type: "text", name: "website", tabindex: "-1", autocomplete: "off" });
    hp.appendChild(hpIn);
    form.appendChild(hp);
    var priv = el("p", { class: "small", style: "margin-top:12px" });
    priv.appendChild(document.createTextNode(ts("privacy") + " "));
    priv.appendChild(el("a", { href: "/datenschutz.html" }, ts("privacyLink")));
    priv.appendChild(document.createTextNode("."));
    form.appendChild(priv);
    var out = el("div");
    var btn = el("button", { type: "submit", class: "go" }, ts("button"));
    form.appendChild(out);
    form.appendChild(btn);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      out.textContent = "";
      var name = form.elements.name.value.trim();
      var email = form.elements.email.value.trim();
      var message = form.elements.message.value.trim();
      if (name.length < 2) return out.appendChild(msg("err", null, t("errName")));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return out.appendChild(msg("err", null, t("errEmail")));
      if (message.length < 10) return out.appendChild(msg("err", null, ts("errMessage")));
      btn.disabled = true;
      btn.textContent = t("sending");
      post("/contact", { name: name, email: email, message: message, website: hpIn.value, lang: lang }).then(
        function (r) {
          if (r.status === 200 && r.json && r.json.ok) {
            btn.style.display = "none";
            form.reset();
            out.appendChild(msg("ok", ts("okTitle"), ts("okNote")));
          } else {
            btn.disabled = false;
            btn.textContent = ts("button");
            out.appendChild(msg("err", null, r.json && r.json.error === "invalid_message" ? ts("errMessage") : fehlerText(r)));
          }
        },
        function () {
          btn.disabled = false;
          btn.textContent = ts("button");
          out.appendChild(msg("err", null, t("errGeneric")));
        }
      );
    });
    return form;
  }

  render();
})();
