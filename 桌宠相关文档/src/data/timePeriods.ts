import type { TimePeriod } from '../types';

export const timePeriods: TimePeriod[] = [
  {
    id: 'dawn',
    name: '黎明',
    startHour: 5,
    endHour: 7,
    emotionModifier: { P: 0.1, A: -0.2, D: -0.1 },
    greetings: [
      '早安呀~天刚亮呢，今天也要元气满满哦！',
      '唔...天亮了...再让我睡五分钟嘛...',
      '新的一天开始了！准备好了吗？',
    ],
  },
  {
    id: 'morning_wake',
    name: '早晨',
    startHour: 7,
    endHour: 9,
    emotionModifier: { P: 0.2, A: 0.1, D: 0.1 },
    greetings: [
      '早上好！今天天气看起来不错呢~',
      '终于起床啦？早餐吃了吗？',
      '早安早安！今天有什么计划吗？',
    ],
  },
  {
    id: 'morning_work',
    name: '上午',
    startHour: 9,
    endHour: 12,
    emotionModifier: { P: 0, A: 0.2, D: 0.2 },
    greetings: [
      '工作学习时间到了，加油哦！',
      '上午好~专注的时候最帅了！',
      '要认真工作啦，我在旁边陪着你~',
    ],
  },
  {
    id: 'lunch',
    name: '中午',
    startHour: 12,
    endHour: 14,
    emotionModifier: { P: 0.1, A: -0.1, D: 0 },
    greetings: [
      '午饭时间到！想吃什么好呢？',
      '辛苦了一上午，该休息一下啦~',
      '吃饭吃饭！吃饱了才有力气继续加油！',
    ],
  },
  {
    id: 'afternoon_work',
    name: '下午',
    startHour: 14,
    endHour: 17,
    emotionModifier: { P: -0.1, A: 0, D: 0 },
    greetings: [
      '下午好~下午茶时间要不要来一杯？',
      '继续加油！离下班/放学不远了~',
      '下午容易犯困呢，要不要聊聊天提提神？',
    ],
  },
  {
    id: 'evening',
    name: '傍晚',
    startHour: 17,
    endHour: 19,
    emotionModifier: { P: 0.2, A: -0.1, D: 0.1 },
    greetings: [
      '傍晚了呢，夕阳好美~',
      '辛苦一天了，回来啦？',
      '晚上好~今天过得怎么样？',
    ],
  },
  {
    id: 'night',
    name: '夜晚',
    startHour: 19,
    endHour: 22,
    emotionModifier: { P: 0.1, A: -0.2, D: 0 },
    greetings: [
      '晚上好~终于可以放松了！',
      '夜幕降临了呢，今天过得开心吗？',
      '晚上啦~要不要一起做点什么？',
    ],
  },
  {
    id: 'late_night',
    name: '深夜',
    startHour: 22,
    endHour: 24,
    emotionModifier: { P: -0.1, A: -0.3, D: -0.2 },
    greetings: [
      '这么晚了还不睡吗？要注意休息哦...',
      '夜深了呢...要不要听个故事？',
      '困困的...但是想陪你再待一会儿...',
    ],
  },
  {
    id: 'midnight',
    name: '凌晨',
    startHour: 0,
    endHour: 5,
    emotionModifier: { P: -0.2, A: -0.4, D: -0.3 },
    greetings: [
      '...你怎么还没睡？这样对身体不好...',
      '凌晨了呢...快去睡觉吧，我会等你的...',
      '嘘...夜深了...明天还要早起呢...',
    ],
  },
];

export function getCurrentTimePeriod(): TimePeriod {
  const hour = new Date().getHours();
  return (
    timePeriods.find(
      (p) =>
        (p.startHour < p.endHour && hour >= p.startHour && hour < p.endHour) ||
        (p.startHour >= p.endHour && (hour >= p.startHour || hour < p.endHour))
    ) ?? timePeriods[0]
  );
}

export function getTimePeriodGreeting(
  period: TimePeriod,
  characterId: string
): string {
  const greetings = period.greetings;
  // Use character id as seed for consistent greeting per character
  // 5 角色 id 映射到 3 段问候池（spa/cor 偏活泼=0, aln/cla 偏温柔=1, fls 偏热血=2）
  const charToBucket: Record<string, number> = {
    spa: 0, cor: 0,
    aln: 1, cla: 1,
    fls: 2,
    // 兼容旧 id
    lumie: 0, yueya: 1, leo: 2,
  };
  const index = charToBucket[characterId] ?? 0;
  return greetings[index % greetings.length];
}
