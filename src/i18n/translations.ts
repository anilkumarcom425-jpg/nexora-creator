import { ProjectCategory, SectionId, UILanguage } from '../types/nexora';

export interface Translations {
  brand: {
    name: string;
    product: string;
    tagline: string;
  };
  nav: Record<SectionId, string>;
  categories: Record<ProjectCategory | 'all', string>;
  common: {
    generate: string;
    generating: string;
    regenerate: string;
    copy: string;
    copied: string;
    edit: string;
    doneEditing: string;
    save: string;
    saved: string;
    openInEditor: string;
    downloadTxt: string;
    improve: string;
    expand: string;
    summarize: string;
    shorten: string;
    rewrite: string;
    readability: string;
    delete: string;
    confirmDelete: string;
    cancel: string;
    rename: string;
    searchPlaceholder: string;
    language: string;
    words: string;
    characters: string;
    localStorageBadge: string;
    requiredField: string;
    errorPrefix: string;
    customOption: string;
    activeTarget: string;
    partLabel: string;
    seconds: string;
    minutes: string;
    multiPartGenerating: string;
    preservingContentWhileRetrying: string;
  };
  home: {
    welcomeTitle: string;
    welcomeSubtitle: string;
    startCreating: string;
    openProjects: string;
    statProjects: string;
    statCharacters: string;
    statWords: string;
    statStorage: string;
    localModeValue: string;
    shortcutsHeading: string;
    recentHeading: string;
    noRecentProjects: string;
    noRecentHint: string;
    shortcuts: Array<{
      id: SectionId;
      title: string;
      desc: string;
    }>;
  };
  blog: {
    title: string;
    subtitle: string;
    topicLabel: string;
    topicPlaceholder: string;
    mainKeywordLabel: string;
    mainKeywordPlaceholder: string;
    secondaryKeywordsLabel: string;
    secondaryKeywordsPlaceholder: string;
    audienceLabel: string;
    audiencePlaceholder: string;
    languageLabel: string;
    styleLabel: string;
    wordCountLabel: string;
    customWordCountLabel: string;
    customWordCountPlaceholder: string;
    seoTitle: string;
    metaDescription: string;
    introduction: string;
    examplesHeading: string;
    conclusionHeading: string;
    faqsHeading: string;
    keywordSuggestionsHeading: string;
    paragraphToolTitle: string;
    paragraphToolPlaceholder: string;
    emptyResultTitle: string;
    emptyResultDesc: string;
  };
  shorts: {
    title: string;
    subtitle: string;
    topicLabel: string;
    topicPlaceholder: string;
    durationLabel: string;
    customDurationLabel: string;
    customDurationPlaceholder: string;
    categoryLabel: string;
    languageLabel: string;
    toneLabel: string;
    charactersLabel: string;
    charactersPlaceholder: string;
    sceneCountLabel: string;
    includeNarrator: string;
    includeLikeSubscribe: string;
    rulesNote: string;
    hookHeading: string;
    appearanceGuideHeading: string;
    sceneLabel: string;
    speakerLabel: string;
    dialogueLabel: string;
    visualLabel: string;
    imagePromptLabel: string;
    videoPromptLabel: string;
    endingHeading: string;
    ctaHeading: string;
  };
  longVideo: {
    title: string;
    subtitle: string;
    topicLabel: string;
    topicPlaceholder: string;
    durationLabel: string;
    customDurationLabel: string;
    customDurationPlaceholder: string;
    longDurationNotice: string;
    formatLabel: string;
    languageLabel: string;
    deliveryLabel: string;
    audienceLabel: string;
    audiencePlaceholder: string;
    toneLabel: string;
    videoTitleHeading: string;
    hookHeading: string;
    introHeading: string;
    sectionsHeading: string;
    sceneSuggestionLabel: string;
    transitionLabel: string;
    conclusionHeading: string;
    ctaHeading: string;
  };
  social: {
    title: string;
    subtitle: string;
    contentTypeLabel: string;
    toneLabel: string;
    languageLabel: string;
    lengthLabel: string;
    customLengthLabel: string;
    customLengthPlaceholder: string;
    topicLabel: string;
    topicPlaceholder: string;
    detailsLabel: string;
    detailsPlaceholder: string;
    includeCta: string;
    hookHeading: string;
    primaryHeading: string;
    alternativesHeading: string;
    hashtagsHeading: string;
    ctaHeading: string;
  };
  story: {
    title: string;
    subtitle: string;
    charStudioTitle: string;
    charName: string;
    charRole: string;
    charPersonality: string;
    charAppearance: string;
    charVoice: string;
    saveCharacter: string;
    updateCharacter: string;
    savedCharactersTitle: string;
    noCharacters: string;
    selectHint: string;
    premiseLabel: string;
    premisePlaceholder: string;
    genreLabel: string;
    toneLabel: string;
    sceneCountLabel: string;
    lengthLabel: string;
    customWordCountLabel: string;
    customWordCountPlaceholder: string;
    languageLabel: string;
    generateStory: string;
    characterSummaryHeading: string;
    dialoguesHeading: string;
    imagePromptLabel: string;
    videoPromptLabel: string;
    endingHeading: string;
  };
  prompts: {
    title: string;
    subtitle: string;
    ideaLabel: string;
    ideaPlaceholder: string;
    categoryLabel: string;
    styleLabel: string;
    stylePlaceholder: string;
    aspectLabel: string;
    outputLangLabel: string;
    mainPromptHeading: string;
    techNotesHeading: string;
    avoidHeading: string;
    variationsHeading: string;
  };
  editor: {
    title: string;
    subtitle: string;
    docTitleLabel: string;
    docTitlePlaceholder: string;
    categoryLabel: string;
    contentPlaceholder: string;
    aiInstructionLabel: string;
    aiInstructionPlaceholder: string;
  };
  projects: {
    title: string;
    subtitle: string;
    storageNotice: string;
    emptyTitle: string;
    emptyDesc: string;
    noSearchTitle: string;
    noSearchDesc: string;
    createNew: string;
    updatedLabel: string;
  };
  settings: {
    title: string;
    subtitle: string;
    interfaceLangTitle: string;
    interfaceLangDesc: string;
    defaultGenLangTitle: string;
    defaultGenLangDesc: string;
    aiEngineTitle: string;
    aiEngineDesc: string;
    aiReady: string;
    aiMissingKey: string;
    storageTitle: string;
    storageDesc: string;
    exportBackup: string;
    clearData: string;
    clearConfirm: string;
    dataCleared: string;
  };
}

export const TRANSLATIONS: Record<UILanguage, Translations> = {
  hi: {
    brand: {
      name: 'NEXORA',
      product: 'NEXORA Creator',
      tagline: 'विचारों से नवाचार तक — Ideas Into Innovation.',
    },
    nav: {
      home: 'होम',
      blog: 'AI ब्लॉग राइटर',
      shorts: 'YouTube शॉर्ट्स स्क्रिप्ट',
      'long-video': 'लॉन्ग वीडियो राइटर',
      social: 'सोशल मीडिया क्रिएटर',
      story: 'स्टोरी व कैरेक्टर स्टूडियो',
      prompts: 'AI प्रॉम्प्ट जनरेटर',
      editor: 'कंटेंट एडिटर',
      projects: 'मेरे प्रोजेक्ट्स',
      settings: 'सेटिंग्स',
    },
    categories: {
      all: 'सभी श्रेणियां',
      blog: 'ब्लॉग लेख',
      shorts: 'YouTube शॉर्ट्स',
      'long-video': 'लॉन्ग वीडियो',
      social: 'सोशल मीडिया',
      story: 'कहानी व पात्र',
      prompts: 'AI प्रॉम्प्ट',
      editor: 'एडिटर नोट्स',
    },
    common: {
      generate: 'कंटेंट जनरेट करें',
      generating: 'AI तैयार कर रहा है...',
      regenerate: 'फिर से बनाएं',
      copy: 'कॉपी करें',
      copied: 'कॉपी हो गया',
      edit: 'एडिट करें',
      doneEditing: 'एडिट पूरा',
      save: 'प्रोजेक्ट सेव करें',
      saved: 'सेव हो गया',
      openInEditor: 'एडिटर में खोलें',
      downloadTxt: 'TXT डाउनलोड',
      improve: 'लेखन सुधारें',
      expand: 'विस्तार करें',
      summarize: 'संक्षेप करें',
      shorten: 'छोटा करें',
      rewrite: 'फिर से लिखें',
      readability: 'पठनीयता सुधारें',
      delete: 'हटाएं',
      confirmDelete: 'पक्का हटाएं?',
      cancel: 'रद्द करें',
      rename: 'नाम बदलें',
      searchPlaceholder: 'प्रोजेक्ट का नाम या सामग्री खोजें...',
      language: 'भाषा',
      words: 'शब्द',
      characters: 'अक्षर',
      localStorageBadge: 'स्थानीय ब्राउज़र स्टोरेज',
      requiredField: 'कृपया आवश्यक विवरण भरें।',
      errorPrefix: 'त्रुटि:',
      customOption: 'कस्टम (Custom)',
      activeTarget: 'लक्ष्य लंबाई:',
      partLabel: 'भाग',
      seconds: 'सेकंड',
      minutes: 'मिनट',
      multiPartGenerating: 'लंबी अवधि/शब्द सीमा के कारण भागों में तैयार हो रहा है...',
      preservingContentWhileRetrying: 'आपका पहले से तैयार कंटेंट सुरक्षित है — नया संस्करण तैयार किया जा रहा है...',
    },
    home: {
      welcomeTitle: 'NEXORA Creator में आपका स्वागत है',
      welcomeSubtitle: 'ब्लॉग, YouTube शॉर्ट्स, लॉन्ग वीडियो स्क्रिप्ट, सोशल मीडिया पोस्ट, कहानियां और सटीक AI प्रॉम्प्ट एक ही प्रोफेशनल स्टूडियो में बनाएं।',
      startCreating: 'ब्लॉग लिखना शुरू करें',
      openProjects: 'मेरे प्रोजेक्ट्स देखें',
      statProjects: 'सेव प्रोजेक्ट्स',
      statCharacters: 'सेव पात्र',
      statWords: 'कुल शब्द सेव',
      statStorage: 'स्टोरेज मोड',
      localModeValue: 'स्थानीय (Local)',
      shortcutsHeading: 'क्रिएशन टूल्स',
      recentHeading: 'हाल के प्रोजेक्ट्स',
      noRecentProjects: 'अभी कोई प्रोजेक्ट सेव नहीं है',
      noRecentHint: 'ऊपर दिए गए किसी भी टूल से कंटेंट बनाएं और "प्रोजेक्ट सेव करें" पर क्लिक करें।',
      shortcuts: [
        { id: 'blog', title: 'AI ब्लॉग राइटर', desc: 'SEO शीर्षक, H2/H3 हेडिंग्स, उदाहरण और 3 FAQs सहित पूर्ण लेख।' },
        { id: 'shorts', title: 'YouTube शॉर्ट्स स्क्रिप्ट', desc: '15–60 सेकंड की सीन-बाय-सीन स्क्रिप्ट, संवाद नियम व प्रॉम्प्ट।' },
        { id: 'long-video', title: 'लॉन्ग वीडियो राइटर', desc: '5–20 मिनट के वीडियो के लिए टाइमस्टैम्प और ट्रांज़िशन स्क्रिप्ट।' },
        { id: 'social', title: 'सोशल मीडिया क्रिएटर', desc: 'Instagram, Facebook, YouTube और बिज़नेस के लिए आकर्षक पोस्ट।' },
        { id: 'story', title: 'स्टोरी व कैरेक्टर स्टूडियो', desc: 'पात्र सेव करें और हर सीन में समान रूप-रंग व संवाद बनाएं।' },
        { id: 'prompts', title: 'AI प्रॉम्प्ट जनरेटर', desc: 'साधारण विचार को विस्तृत इमेज, वीडियो या मार्केटिंग प्रॉम्प्ट में बदलें।' },
      ],
    },
    blog: {
      title: 'AI ब्लॉग राइटर',
      subtitle: 'सर्च इंजन के अनुकूल, स्पष्ट और उपयोगी लेख बनाएं — H2/H3 हेडिंग्स, उदाहरण और ठीक 3 FAQs के साथ।',
      topicLabel: 'ब्लॉग का विषय',
      topicPlaceholder: 'जैसे: छोटे व्यवसाय के लिए डिजिटल मार्केटिंग कैसे शुरू करें',
      mainKeywordLabel: 'मुख्य कीवर्ड',
      mainKeywordPlaceholder: 'जैसे: डिजिटल मार्केटिंग टिप्स',
      secondaryKeywordsLabel: 'अतिरिक्त कीवर्ड (कॉमा से अलग)',
      secondaryKeywordsPlaceholder: 'जैसे: सोशल मीडिया, SEO, ऑनलाइन ग्रोथ',
      audienceLabel: 'लक्षित पाठक (Target Audience)',
      audiencePlaceholder: 'जैसे: नए उद्यमी और दुकानदार',
      languageLabel: 'लेखन भाषा',
      styleLabel: 'लेखन शैली',
      wordCountLabel: 'शब्द सीमा',
      customWordCountLabel: 'कस्टम शब्द संख्या (150–10000)',
      customWordCountPlaceholder: 'जैसे: 1250 या 3500',
      seoTitle: 'SEO शीर्षक',
      metaDescription: 'मेटा विवरण (Meta Description)',
      introduction: 'परिचय (Introduction)',
      examplesHeading: 'व्यावहारिक उदाहरण',
      conclusionHeading: 'निष्कर्ष',
      faqsHeading: 'अक्सर पूछे जाने वाले प्रश्न (3 FAQs)',
      keywordSuggestionsHeading: 'सुझाए गए SEO कीवर्ड',
      paragraphToolTitle: 'पैराग्राफ सुधार टूल (रीराइट / विस्तार / संक्षिप्त)',
      paragraphToolPlaceholder: 'यहाँ कोई भी पैराग्राफ पेस्ट करें या ऊपर से कॉपी करें...',
      emptyResultTitle: 'आपका ब्लॉग यहाँ दिखेगा',
      emptyResultDesc: 'बाईं ओर विषय और कीवर्ड दर्ज करें और "कंटेंट जनरेट करें" दबाएं।',
    },
    shorts: {
      title: 'YouTube शॉर्ट्स स्क्रिप्ट राइटर',
      subtitle: '15 से 60 सेकंड की सटीक सीन-दर-सीन स्क्रिप्ट — पात्र संवाद नियंत्रण और AI इमेज/वीडियो प्रॉम्प्ट के साथ।',
      topicLabel: 'शॉर्ट्स का विषय',
      topicPlaceholder: 'जैसे: समय बचाने के 3 स्मार्ट नियम',
      durationLabel: 'वीडियो अवधि',
      customDurationLabel: 'कस्टम अवधि (जैसे 10 सेकंड, 2 मिनट)',
      customDurationPlaceholder: 'संख्या लिखें, जैसे 10 या 2',
      categoryLabel: 'वीडियो श्रेणी',
      languageLabel: 'भाषा',
      toneLabel: 'टोन (लहज़ा)',
      charactersLabel: 'पात्रों के नाम (कॉमा से अलग)',
      charactersPlaceholder: 'जैसे: आरव, प्रिया',
      sceneCountLabel: 'सीन की संख्या',
      includeNarrator: 'नैरेटर (कथावाचक) शामिल करें',
      includeLikeSubscribe: 'अंत में Like और Subscribe लाइन जोड़ें',
      rulesNote: 'नियम लागू: हर पात्र केवल अपना संवाद बोलेगा, कोई ओवरलैपिंग नहीं, केवल बोलने वाले पात्र का मुंह हिलेगा, और सभी सीन में रूप-रंग समान रहेगा।',
      hookHeading: 'ओपनिंग हुक (Opening Hook)',
      appearanceGuideHeading: 'पात्र रूप-रंग गाइड (Consistency)',
      sceneLabel: 'सीन',
      speakerLabel: 'बोलने वाला पात्र',
      dialogueLabel: 'संवाद',
      visualLabel: 'दृश्य विवरण (Visual Description)',
      imagePromptLabel: 'AI इमेज प्रॉम्प्ट',
      videoPromptLabel: 'AI वीडियो प्रॉम्प्ट',
      endingHeading: 'समापन (Ending)',
      ctaHeading: 'Like & Subscribe लाइन',
    },
    longVideo: {
      title: 'लॉन्ग YouTube वीडियो राइटर',
      subtitle: '5 से 20 मिनट के गहन वीडियो के लिए विस्तृत सेक्शन, टाइमस्टैम्प, दृश्य सुझाव और ट्रांज़िशन बनाएं।',
      topicLabel: 'वीडियो का विषय',
      topicPlaceholder: 'जैसे: भारत में EV स्टार्टअप कैसे सफल हो रहे हैं',
      durationLabel: 'वीडियो अवधि',
      customDurationLabel: 'कस्टम अवधि मिनटों में (1–240 मिनट)',
      customDurationPlaceholder: 'जैसे: 5, 20, 60 या 120',
      longDurationNotice: '25 मिनट से अधिक अवधि पर स्क्रिप्ट को स्वचालित रूप से क्रमबद्ध भागों (Parts) में तैयार किया जाएगा।',
      formatLabel: 'वीडियो फ़ॉर्मेट',
      languageLabel: 'भाषा',
      deliveryLabel: 'प्रस्तुति मोड (संवाद / नैरेशन)',
      audienceLabel: 'लक्षित दर्शक',
      audiencePlaceholder: 'जैसे: युवा और टेक प्रेमी',
      toneLabel: 'टोन',
      videoTitleHeading: 'वीडियो शीर्षक',
      hookHeading: 'ओपनिंग हुक',
      introHeading: 'परिचय',
      sectionsHeading: 'विस्तृत सेक्शन व टाइमस्टैम्प',
      sceneSuggestionLabel: 'दृश्य सुझाव',
      transitionLabel: 'ट्रांज़िशन',
      conclusionHeading: 'निष्कर्ष',
      ctaHeading: 'दर्शक जुड़ाव CTA',
    },
    social: {
      title: 'सोशल मीडिया क्रिएटर',
      subtitle: 'Instagram, Facebook, YouTube और उत्पाद प्रचार के लिए तुरंत पब्लिश करने योग्य सामग्री तैयार करें।',
      contentTypeLabel: 'कंटेंट प्रकार',
      toneLabel: 'टोन चुनें',
      languageLabel: 'भाषा',
      lengthLabel: 'कंटेंट की लंबाई',
      customLengthLabel: 'कस्टम लंबाई',
      customLengthPlaceholder: 'जैसे: 120 या 400',
      topicLabel: 'विषय / उत्पाद / घोषणा',
      topicPlaceholder: 'जैसे: नया हैंडमेड ऑर्गेनिक स्किनकेयर लॉन्च ऑफर',
      detailsLabel: 'अतिरिक्त जानकारी (वैकल्पिक)',
      detailsPlaceholder: 'जैसे: 20% लॉन्च छूट, सभी प्रकार की त्वचा के लिए सुरक्षित',
      includeCta: 'Call-to-Action (CTA) शामिल करें',
      hookHeading: 'मुख्य हुक / शीर्षक',
      primaryHeading: 'मुख्य पोस्ट / कैप्शन',
      alternativesHeading: 'वैकल्पिक संस्करण',
      hashtagsHeading: 'सुझाए गए हैशटैग',
      ctaHeading: 'सुझाया गया CTA',
    },
    story: {
      title: 'स्टोरी व कैरेक्टर स्टूडियो',
      subtitle: 'अपने स्थायी पात्र बनाएं, उनका विवरण सेव करें और हर सीन में समान रूप-रंग व सटीक संवाद वाली कहानियां लिखें।',
      charStudioTitle: 'पात्र निर्माण व लाइब्रेरी',
      charName: 'पात्र का नाम',
      charRole: 'भूमिका (Role)',
      charPersonality: 'स्वभाव (Personality)',
      charAppearance: 'रूप-रंग और कपड़े (Consistency के लिए)',
      charVoice: 'बोलने का अंदाज़',
      saveCharacter: 'पात्र सेव करें',
      updateCharacter: 'पात्र अपडेट करें',
      savedCharactersTitle: 'सेव किए गए पात्र (कहानी में जोड़ने के लिए चुनें)',
      noCharacters: 'अभी कोई पात्र सेव नहीं है। ऊपर से नया पात्र बनाएं।',
      selectHint: 'चयनित पात्रों का विवरण नई कहानी और हर सीन के इमेज/वीडियो प्रॉम्प्ट में स्वतः शामिल होगा।',
      premiseLabel: 'कहानी का मुख्य विचार (Premise)',
      premisePlaceholder: 'जैसे: दो दोस्त एक पुराने नक्शे की मदद से जंगल में छिपा सौर ऊर्जा संयंत्र खोजते हैं',
      genreLabel: 'कहानी शैली (Genre)',
      toneLabel: 'टोन',
      sceneCountLabel: 'सीन की संख्या',
      lengthLabel: 'कहानी की लंबाई',
      customWordCountLabel: 'कस्टम शब्द संख्या (150–10000)',
      customWordCountPlaceholder: 'जैसे: 650 या 2500',
      languageLabel: 'कहानी भाषा',
      generateStory: 'कहानी और सीन प्रॉम्प्ट बनाएं',
      characterSummaryHeading: 'पात्र संदर्भ सारांश',
      dialoguesHeading: 'सीन संवाद',
      imagePromptLabel: 'सीन AI इमेज प्रॉम्प्ट',
      videoPromptLabel: 'सीन AI वीडियो प्रॉम्प्ट',
      endingHeading: 'कहानी का अंत',
    },
    prompts: {
      title: 'AI प्रॉम्प्ट जनरेटर',
      subtitle: 'अपने साधारण आइडिया को इमेज, वीडियो, कार्टून, कैरेक्टर या बिज़नेस के लिए विस्तृत प्रोफेशनल प्रॉम्प्ट में बदलें।',
      ideaLabel: 'आपका साधारण आइडिया',
      ideaPlaceholder: 'जैसे: पहाड़ों में बारिश के बीच एक आधुनिक कांच का कैफे',
      categoryLabel: 'प्रॉम्प्ट श्रेणी',
      styleLabel: 'स्टाइल / मूड (वैकल्पिक)',
      stylePlaceholder: 'जैसे: सिनेमैटिक, 35mm लेंस, वार्म लाइटिंग',
      aspectLabel: 'आस्पेक्ट रेशियो / फॉर्मेट',
      outputLangLabel: 'प्रॉम्प्ट भाषा',
      mainPromptHeading: 'मुख्य विस्तृत प्रॉम्प्ट',
      techNotesHeading: 'कैमरा, लाइटिंग व संरचना नोट्स',
      avoidHeading: 'नेगेटिव / बचने योग्य बिंदु',
      variationsHeading: 'वैकल्पिक प्रॉम्प्ट रूप',
    },
    editor: {
      title: 'कंटेंट एडिटर',
      subtitle: 'किसी भी जनरेट किए गए कंटेंट या अपने ड्राफ्ट को एडिट करें, सुधारें, विस्तार करें, संक्षिप्त करें, सेव करें या TXT में डाउनलोड करें।',
      docTitleLabel: 'दस्तावेज़ शीर्षक',
      docTitlePlaceholder: 'अपनी रचना का शीर्षक लिखें...',
      categoryLabel: 'श्रेणी',
      contentPlaceholder: 'यहाँ लिखना शुरू करें या किसी टूल से कंटेंट भेजें...',
      aiInstructionLabel: 'AI सुधार निर्देश (वैकल्पिक)',
      aiInstructionPlaceholder: 'जैसे: इसे थोड़ा और सरल और भावनात्मक बनाएं',
    },
    projects: {
      title: 'मेरे प्रोजेक्ट्स',
      subtitle: 'आपके सभी सेव किए गए लेख, स्क्रिप्ट, कहानियां और प्रॉम्प्ट।',
      storageNotice: 'ध्यान दें: आपके प्रोजेक्ट्स इस ब्राउज़र के स्थानीय स्टोरेज (Local Storage) में सुरक्षित हैं। क्लाउड सिंक सक्रिय नहीं है।',
      emptyTitle: 'अभी कोई प्रोजेक्ट सेव नहीं है',
      emptyDesc: 'कोई ब्लॉग, स्क्रिप्ट, कहानी या एडिटर नोट सेव करने के बाद वह यहाँ दिखाई देगा।',
      noSearchTitle: 'कोई मिलता-जुलता प्रोजेक्ट नहीं मिला',
      noSearchDesc: 'खोज शब्द या श्रेणी फ़िल्टर बदलकर देखें।',
      createNew: 'नया कंटेंट बनाएं',
      updatedLabel: 'अपडेट:',
    },
    settings: {
      title: 'सेटिंग्स',
      subtitle: 'NEXORA Creator की भाषा, डिफ़ॉल्ट लेखन प्राथमिकताएं और स्थानीय डेटा प्रबंधन।',
      interfaceLangTitle: 'इंटरफ़ेस भाषा (Interface Language)',
      interfaceLangDesc: 'पूरे डैशबोर्ड की भाषा हिंदी या English में बदलें।',
      defaultGenLangTitle: 'डिफ़ॉल्ट कंटेंट जनरेशन भाषा',
      defaultGenLangDesc: 'सभी टूल्स में नए कंटेंट के लिए प्रारंभिक भाषा।',
      aiEngineTitle: 'AI इंजन स्थिति (Server-side Gemini)',
      aiEngineDesc: 'सभी AI अनुरोध सुरक्षित सर्वर रूट के माध्यम से Gemini मॉडल पर चलते हैं।',
      aiReady: 'सर्वर Gemini API सक्रिय और तैयार है।',
      aiMissingKey: 'सर्वर पर GEMINI_API_KEY सेट नहीं है। कृपया Settings > Secrets में की कॉन्फ़िगर करें।',
      storageTitle: 'स्थानीय स्टोरेज व बैकअप',
      storageDesc: 'प्रोजेक्ट्स और पात्र केवल आपके वर्तमान ब्राउज़र में सहेजे जाते हैं।',
      exportBackup: 'JSON बैकअप डाउनलोड करें',
      clearData: 'सारा स्थानीय डेटा साफ़ करें',
      clearConfirm: 'क्या आप वाकई सभी प्रोजेक्ट्स और पात्र हटाना चाहते हैं?',
      dataCleared: 'स्थानीय डेटा सफलतापूर्वक साफ़ किया गया।',
    },
  },
  en: {
    brand: {
      name: 'NEXORA',
      product: 'NEXORA Creator',
      tagline: 'Ideas Into Innovation.',
    },
    nav: {
      home: 'Home',
      blog: 'AI Blog Writer',
      shorts: 'YouTube Script Writer',
      'long-video': 'Long Video Writer',
      social: 'Social Media Creator',
      story: 'Story & Character Studio',
      prompts: 'AI Prompt Generator',
      editor: 'Content Editor',
      projects: 'My Projects',
      settings: 'Settings',
    },
    categories: {
      all: 'All Categories',
      blog: 'Blog Article',
      shorts: 'YouTube Shorts',
      'long-video': 'Long Video',
      social: 'Social Media',
      story: 'Story & Characters',
      prompts: 'AI Prompts',
      editor: 'Editor Drafts',
    },
    common: {
      generate: 'Generate Content',
      generating: 'Generating with AI...',
      regenerate: 'Regenerate',
      copy: 'Copy',
      copied: 'Copied',
      edit: 'Edit',
      doneEditing: 'Done Editing',
      save: 'Save Project',
      saved: 'Saved',
      openInEditor: 'Open in Editor',
      downloadTxt: 'Download TXT',
      improve: 'Improve Writing',
      expand: 'Expand',
      summarize: 'Summarize',
      shorten: 'Shorten',
      rewrite: 'Rewrite',
      readability: 'Improve Readability',
      delete: 'Delete',
      confirmDelete: 'Confirm Delete?',
      cancel: 'Cancel',
      rename: 'Rename',
      searchPlaceholder: 'Search projects by title or content...',
      language: 'Language',
      words: 'words',
      characters: 'chars',
      localStorageBadge: 'Local Browser Storage',
      requiredField: 'Please fill in the required field.',
      errorPrefix: 'Error:',
      customOption: 'Custom',
      activeTarget: 'Target Length:',
      partLabel: 'Part',
      seconds: 'seconds',
      minutes: 'minutes',
      multiPartGenerating: 'Generating long content in ordered parts...',
      preservingContentWhileRetrying: 'Existing content safely preserved — generating updated output...',
    },
    home: {
      welcomeTitle: 'Welcome to NEXORA Creator',
      welcomeSubtitle: 'Create SEO-ready blogs, YouTube Shorts and long-form scripts, social campaigns, character-consistent stories, and precision AI prompts in one studio.',
      startCreating: 'Open AI Blog Writer',
      openProjects: 'View My Projects',
      statProjects: 'Saved Projects',
      statCharacters: 'Saved Characters',
      statWords: 'Total Words Saved',
      statStorage: 'Storage Mode',
      localModeValue: 'Local Browser',
      shortcutsHeading: 'Creation Studios',
      recentHeading: 'Recent Projects',
      noRecentProjects: 'No saved projects yet',
      noRecentHint: 'Create content in any tool above and click "Save Project" to build your library.',
      shortcuts: [
        { id: 'blog', title: 'AI Blog Writer', desc: 'SEO titles, meta descriptions, H2/H3 structure, examples, and 3 FAQs.' },
        { id: 'shorts', title: 'YouTube Shorts Writer', desc: '15–60s scene-by-scene scripts with strict dialogue & prompt control.' },
        { id: 'long-video', title: 'Long Video Writer', desc: '5–20 minute scripts with timestamps, transitions, and viewer CTAs.' },
        { id: 'social', title: 'Social Media Creator', desc: 'Captions, posts, titles, descriptions, hashtags, and promos.' },
        { id: 'story', title: 'Story & Character Studio', desc: 'Reusable character profiles with consistent scene-wise prompts.' },
        { id: 'prompts', title: 'AI Prompt Generator', desc: 'Turn simple ideas into detailed image, video, and marketing prompts.' },
      ],
    },
    blog: {
      title: 'AI Blog Writer',
      subtitle: 'Generate practical, original, well-structured articles with SEO titles, H2/H3 headings, examples, and exactly 3 FAQs.',
      topicLabel: 'Blog Topic',
      topicPlaceholder: 'e.g. How small businesses can automate customer support responsibly',
      mainKeywordLabel: 'Main Keyword',
      mainKeywordPlaceholder: 'e.g. small business automation',
      secondaryKeywordsLabel: 'Secondary Keywords (comma-separated)',
      secondaryKeywordsPlaceholder: 'e.g. workflow tools, customer retention, ROI',
      audienceLabel: 'Target Audience',
      audiencePlaceholder: 'e.g. Small business owners and founders',
      languageLabel: 'Writing Language',
      styleLabel: 'Writing Style',
      wordCountLabel: 'Word Count',
      customWordCountLabel: 'Custom Word Count (150–10000)',
      customWordCountPlaceholder: 'e.g. 1250 or 3500',
      seoTitle: 'SEO Title',
      metaDescription: 'Meta Description',
      introduction: 'Introduction',
      examplesHeading: 'Relevant Examples',
      conclusionHeading: 'Conclusion',
      faqsHeading: 'Frequently Asked Questions (3 FAQs)',
      keywordSuggestionsHeading: 'SEO Keyword Suggestions',
      paragraphToolTitle: 'Paragraph Polish Tool (Rewrite / Expand / Shorten)',
      paragraphToolPlaceholder: 'Paste any paragraph here to rewrite, expand, or shorten it...',
      emptyResultTitle: 'Your generated article will appear here',
      emptyResultDesc: 'Enter your topic and keywords on the left, then click "Generate Content".',
    },
    shorts: {
      title: 'YouTube Shorts Script Writer',
      subtitle: '15 to 60 second scene-by-scene Shorts scripts with strict character dialogue rules and per-scene AI image/video prompts.',
      topicLabel: 'Shorts Topic',
      topicPlaceholder: 'e.g. 3 daily habits that double morning focus',
      durationLabel: 'Duration',
      customDurationLabel: 'Custom Duration (e.g. 10 seconds, 2 minutes)',
      customDurationPlaceholder: 'Enter number, e.g. 10 or 2',
      categoryLabel: 'Video Category',
      languageLabel: 'Language',
      toneLabel: 'Tone',
      charactersLabel: 'Character Names (comma-separated)',
      charactersPlaceholder: 'e.g. Aarav, Priya',
      sceneCountLabel: 'Number of Scenes',
      includeNarrator: 'Include Narrator',
      includeLikeSubscribe: 'Include Like and Subscribe line at ending',
      rulesNote: 'Strict rules active: Each character speaks only their assigned line, zero overlapping dialogue, only the speaking character moves their mouth, and appearance remains consistent.',
      hookHeading: 'Opening Hook',
      appearanceGuideHeading: 'Character Appearance Guide',
      sceneLabel: 'Scene',
      speakerLabel: 'Speaking Character',
      dialogueLabel: 'Dialogue',
      visualLabel: 'Visual Description',
      imagePromptLabel: 'AI Image Prompt',
      videoPromptLabel: 'AI Video Prompt',
      endingHeading: 'Ending',
      ctaHeading: 'Like & Subscribe Line',
    },
    longVideo: {
      title: 'Long YouTube Video Script Writer',
      subtitle: 'Full 5 to 20 minute video scripts with hooks, timestamped sections, scene suggestions, transitions, and viewer CTAs.',
      topicLabel: 'Video Topic',
      topicPlaceholder: 'e.g. The complete history and future of solid-state batteries',
      durationLabel: 'Video Duration',
      customDurationLabel: 'Custom Duration in Minutes (1–240 min)',
      customDurationPlaceholder: 'e.g. 5, 20, 60, or 120',
      longDurationNotice: 'Durations above 25 minutes are automatically generated in ordered sequential parts.',
      formatLabel: 'Video Format',
      languageLabel: 'Language',
      deliveryLabel: 'Delivery Style (Dialogue / Narration)',
      audienceLabel: 'Target Audience',
      audiencePlaceholder: 'e.g. Tech enthusiasts and curious learners',
      toneLabel: 'Tone',
      videoTitleHeading: 'Video Title',
      hookHeading: 'Opening Hook',
      introHeading: 'Introduction',
      sectionsHeading: 'Detailed Sections & Timestamps',
      sceneSuggestionLabel: 'Scene Suggestion',
      transitionLabel: 'Transition',
      conclusionHeading: 'Conclusion',
      ctaHeading: 'Viewer Engagement CTA',
    },
    social: {
      title: 'Social Media Creator',
      subtitle: 'Create ready-to-publish Instagram captions, Facebook posts, YouTube metadata, hashtags, promos, and announcements.',
      contentTypeLabel: 'Content Type',
      toneLabel: 'Select Tone',
      languageLabel: 'Language',
      lengthLabel: 'Content Length',
      customLengthLabel: 'Custom Length',
      customLengthPlaceholder: 'e.g. 120 or 400',
      topicLabel: 'Topic / Product / Announcement',
      topicPlaceholder: 'e.g. Summer launch of our zero-sugar cold brew coffee pack',
      detailsLabel: 'Key Details (optional)',
      detailsPlaceholder: 'e.g. 15% launch discount until Sunday, available nationwide',
      includeCta: 'Include Call-to-Action (CTA)',
      hookHeading: 'Headline / Hook',
      primaryHeading: 'Primary Post / Copy',
      alternativesHeading: 'Alternative Variations',
      hashtagsHeading: 'Hashtag Suggestions',
      ctaHeading: 'Suggested CTA',
    },
    story: {
      title: 'Story & Character Studio',
      subtitle: 'Build a reusable character reference library and generate multi-scene stories with consistent visual and dialogue assignments.',
      charStudioTitle: 'Character Reference Builder',
      charName: 'Character Name',
      charRole: 'Role / Archetype',
      charPersonality: 'Personality Traits',
      charAppearance: 'Physical Appearance & Outfit (for visual consistency)',
      charVoice: 'Speaking Style',
      saveCharacter: 'Save Character',
      updateCharacter: 'Update Character',
      savedCharactersTitle: 'Saved Characters (select to include in story)',
      noCharacters: 'No saved characters yet. Create one above to reuse across stories.',
      selectHint: 'Selected character appearances are automatically embedded into every scene image and video prompt.',
      premiseLabel: 'Story Premise',
      premisePlaceholder: 'e.g. Two siblings discover an ancient observatory hidden beneath their grandfather’s workshop',
      genreLabel: 'Genre',
      toneLabel: 'Tone',
      sceneCountLabel: 'Number of Scenes',
      lengthLabel: 'Story Length',
      customWordCountLabel: 'Custom Word Count (150–10000)',
      customWordCountPlaceholder: 'e.g. 650 or 2500',
      languageLabel: 'Story Language',
      generateStory: 'Generate Story & Scene Prompts',
      characterSummaryHeading: 'Character Reference Summary',
      dialoguesHeading: 'Scene Dialogues',
      imagePromptLabel: 'Scene AI Image Prompt',
      videoPromptLabel: 'Scene AI Video Prompt',
      endingHeading: 'Story Ending',
    },
    prompts: {
      title: 'AI Prompt Generator',
      subtitle: 'Transform simple ideas into structured, detailed prompts for images, video, cartoons, characters, and marketing.',
      ideaLabel: 'Simple Idea',
      ideaPlaceholder: 'e.g. A cozy glass cafe in misty pine mountains during monsoon',
      categoryLabel: 'Prompt Category',
      styleLabel: 'Visual Style / Mood (optional)',
      stylePlaceholder: 'e.g. Cinematic 35mm documentary, warm natural light',
      aspectLabel: 'Aspect Ratio / Format',
      outputLangLabel: 'Prompt Language',
      mainPromptHeading: 'Main Detailed Prompt',
      techNotesHeading: 'Camera, Lighting & Structure Notes',
      avoidHeading: 'Negative / Constraints to Avoid',
      variationsHeading: 'Prompt Variations',
    },
    editor: {
      title: 'Content Editor',
      subtitle: 'Edit any generated content or draft from scratch. Improve, expand, summarize, regenerate, save, or export as TXT.',
      docTitleLabel: 'Document Title',
      docTitlePlaceholder: 'Enter a title for this piece...',
      categoryLabel: 'Category',
      contentPlaceholder: 'Start writing here or load generated output from any NEXORA studio...',
      aiInstructionLabel: 'AI Revision Instruction (optional)',
      aiInstructionPlaceholder: 'e.g. Make it punchier and more conversational',
    },
    projects: {
      title: 'My Projects',
      subtitle: 'Manage, rename, edit, search, and export all your saved creations.',
      storageNotice: 'Storage Mode: Projects are persisted locally in your browser (Local Browser Storage). Cloud synchronization is not enabled.',
      emptyTitle: 'No saved projects yet',
      emptyDesc: 'Generate content in any studio and click "Save Project" to keep it here.',
      noSearchTitle: 'No matching projects found',
      noSearchDesc: 'Try adjusting your search query or category filter.',
      createNew: 'Create New Content',
      updatedLabel: 'Updated:',
    },
    settings: {
      title: 'Settings',
      subtitle: 'Configure interface language, default generation language, server AI status, and local data backup.',
      interfaceLangTitle: 'Interface Language',
      interfaceLangDesc: 'Switch the entire NEXORA dashboard between Hindi and English.',
      defaultGenLangTitle: 'Default Content Generation Language',
      defaultGenLangDesc: 'Default language pre-selected inside creation studios.',
      aiEngineTitle: 'AI Engine Status (Server-side Gemini)',
      aiEngineDesc: 'All AI generations run securely through server endpoints powered by Gemini.',
      aiReady: 'Server Gemini API is configured and ready.',
      aiMissingKey: 'GEMINI_API_KEY is not configured on the server. Set it in Settings > Secrets.',
      storageTitle: 'Local Storage & Backup',
      storageDesc: 'Saved projects and characters are stored in this browser’s local storage.',
      exportBackup: 'Export JSON Backup',
      clearData: 'Clear All Local Data',
      clearConfirm: 'Are you sure you want to delete all saved projects and characters?',
      dataCleared: 'Local data cleared successfully.',
    },
  },
};
