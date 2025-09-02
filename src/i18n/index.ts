// i18n Configuration for English and Chinese
export const translations = {
  en: {
    // Navigation
    today: 'Today',
    calendar: 'Calendar',
    add: 'Add',
    tasks: 'Tasks',
    settings: 'Settings',
    
    // Onboarding
    welcome: 'Welcome to Loom',
    tagline: 'weave your days together',
    getStarted: 'Get Started',
    setupProfile: 'Set up your profile',
    displayName: 'Display Name',
    colorPreference: 'Color Preference',
    timezone: 'Timezone',
    continue: 'Continue',
    connectPartner: 'Connect with your partner',
    shareInvite: 'Share this invite link or QR code with your partner to get started together.',
    skipForNow: 'Skip for now',
    allSet: 'All set!',
    startUsing: 'Start using Loom',
    
    // Today view
    nextUp: 'Next up',
    pendingProposals: 'Pending Proposals',
    todaysSchedule: "Today's Schedule",
    noEventsToday: 'No events today',
    timeToGather: 'Time to plan something together!',
    addEvent: 'Add Event',
    propose: 'Propose',
    addTask: 'Add Task',
    
    // Calendar
    threeDayView: '3 Day',
    weekView: 'Week',
    agendaView: 'Agenda',
    all: 'All',
    mine: 'Mine',
    partner: 'Partner',
    shared: 'Shared',
    findOverlap: 'Find Overlap',
    
    // Add Event
    proposeTime: 'Propose Time',
    quickAdd: 'Quick Add',
    title: 'Title',
    when: 'When',
    where: 'Where',
    notes: 'Notes',
    visibility: 'Visibility',
    attendees: 'Attendees',
    reminders: 'Reminders',
    save: 'Save',
    private: 'Private',
    titleOnly: 'Title Only',
    
    // Tasks
    toDo: 'To Do',
    completed: 'Completed',
    addNewTask: 'Add a new task...',
    noTasks: 'No tasks yet',
    addFirstTask: 'Add your first task to get organized!',
    taskToday: 'Today',
    tomorrow: 'Tomorrow',
    overdue: 'Overdue',
    
    // Settings
    profile: 'Profile',
    partnerConnection: 'Partner Connection',
    language: 'Language',
    theme: 'Theme',
    about: 'About',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    version: 'Version',
    build: 'Build',
    
    // Event Detail
    details: 'Details',
    chat: 'Chat',
    checklist: 'Checklist',
    date: 'Date',
    duration: 'Duration',
    createdBy: 'Created by',
    you: 'You',
    duplicate: 'Duplicate',
    edit: 'Edit',
    
    // Common
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    delete: 'Delete',
    confirm: 'Confirm',
    back: 'Back',
    
    // Time formats
    minutes: 'minutes',
    hour: 'hour',
    hours: 'hours',
    min: 'min',
  },
  
  zh: {
    // Navigation
    today: '今天',
    calendar: '日历',
    add: '添加',
    tasks: '任务',
    settings: '设置',
    
    // Onboarding
    welcome: '欢迎使用 Loom',
    tagline: '编织你们的每一天',
    getStarted: '开始使用',
    setupProfile: '设置您的个人资料',
    displayName: '显示名称',
    colorPreference: '颜色偏好',
    timezone: '时区',
    continue: '继续',
    connectPartner: '与您的伴侣连接',
    shareInvite: '与您的伴侣分享此邀请链接或二维码以开始使用。',
    skipForNow: '暂时跳过',
    allSet: '全部设置完成！',
    startUsing: '开始使用 Loom',
    
    // Today view
    nextUp: '即将到来',
    pendingProposals: '待处理提议',
    todaysSchedule: '今日日程',
    noEventsToday: '今天没有活动',
    timeToGather: '是时候计划一些事情了！',
    addEvent: '添加活动',
    propose: '提议',
    addTask: '添加任务',
    
    // Calendar
    threeDayView: '3天',
    weekView: '周',
    agendaView: '议程',
    all: '全部',
    mine: '我的',
    partner: '伴侣',
    shared: '共享',
    findOverlap: '寻找空闲时间',
    
    // Add Event
    proposeTime: '提议时间',
    quickAdd: '快速添加',
    title: '标题',
    when: '时间',
    where: '地点',
    notes: '备注',
    visibility: '可见性',
    attendees: '参与者',
    reminders: '提醒',
    save: '保存',
    private: '私密',
    titleOnly: '仅标题',
    
    // Tasks
    toDo: '待办',
    completed: '已完成',
    addNewTask: '添加新任务...',
    noTasks: '暂无任务',
    addFirstTask: '添加您的第一个任务来保持有序！',
    taskToday: '今天',
    tomorrow: '明天',
    overdue: '过期',
    
    // Settings
    profile: '个人资料',
    partnerConnection: '伴侣连接',
    language: '语言',
    theme: '主题',
    about: '关于',
    light: '浅色',
    dark: '深色',
    system: '系统',
    version: '版本',
    build: '构建',
    
    // Event Detail
    details: '详情',
    chat: '聊天',
    checklist: '清单',
    date: '日期',
    duration: '持续时间',
    createdBy: '创建者',
    you: '您',
    duplicate: '复制',
    edit: '编辑',
    
    // Common
    loading: '加载中...',
    error: '错误',
    success: '成功',
    cancel: '取消',
    delete: '删除',
    confirm: '确认',
    back: '返回',
    
    // Time formats
    minutes: '分钟',
    hour: '小时',
    hours: '小时',
    min: '分',
  }
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;

export const useTranslation = (language: Language = 'en') => {
  const t = (key: TranslationKey): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  return { t };
};

// Time formatting utilities
export const formatTime = (date: Date, language: Language = 'en'): string => {
  if (language === 'zh') {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
  }
  
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit', 
    hour12: true 
  });
};

export const formatDate = (date: Date, language: Language = 'en'): string => {
  if (language === 'zh') {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  }
  
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long', 
    day: 'numeric',
    weekday: 'long'
  });
};