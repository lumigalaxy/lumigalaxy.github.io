import type { PADValues } from '../types';

type IntentCategory =
  | 'greeting'
  | 'farewell'
  | 'compliment'
  | 'tease'
  | 'emotional_share'
  | 'daily_share'
  | 'weather'
  | 'food'
  | 'work'
  | 'play'
  | 'default';

interface DialogueResponse {
  text: string;
  emotionChange: Partial<PADValues>;
}

const intentKeywords: Record<IntentCategory, string[]> = {
  greeting: ['你好', '早上好', '晚上好', '早安', '晚安', '嗨', 'hello', 'hi', '嘿', '哈喽', '在吗'],
  farewell: ['再见', '拜拜', 'bye', '下次见', '走了', '先走了', '我要走了'],
  compliment: ['可爱', '漂亮', '好看', '厉害', '棒', '优秀', '喜欢', '爱你', '真好', '赞'],
  tease: ['笨蛋', '傻瓜', '呆', '傻', '蠢', '哼', '讨厌', '坏蛋', '气死'],
  emotional_share: ['开心', '难过', '伤心', '生气', '焦虑', '紧张', '害怕', '孤独', '委屈', '郁闷', '烦躁', '压力大', '累', '烦'],
  daily_share: ['今天', '昨天', '刚才', '最近', '周末', '假期', '打算', '计划', '想去'],
  weather: ['天气', '下雨', '晴天', '冷', '热', '风', '雪', '温度', '阴天'],
  food: ['吃', '喝', '饿', '美食', '饭', '零食', '奶茶', '蛋糕', '水果', '做饭'],
  work: ['工作', '学习', '上班', '上学', '考试', '作业', '项目', '加班', '开会', '写代码'],
  play: ['玩', '游戏', '看剧', '电影', '音乐', '逛街', '旅游', '运动', '散步'],
  default: [],
};

const responsePools: Record<
  string,
  Record<IntentCategory, DialogueResponse[]>
> = {
  lumie: {
    greeting: [
      { text: '你好呀~见到你好开心！', emotionChange: { P: 0.2, A: 0.1 } },
      { text: '嗨嗨！今天也要一起玩哦~', emotionChange: { P: 0.15, A: 0.15 } },
      { text: '你来啦！等你好久了呢~', emotionChange: { P: 0.25, A: 0.1 } },
      { text: '呀！吓我一跳...开玩笑的啦~', emotionChange: { P: 0.1, A: 0.2 } },
      { text: '欢迎回来~今天过得怎么样？', emotionChange: { P: 0.15, A: 0.05 } },
    ],
    farewell: [
      { text: '要走了吗...那下次见啦！', emotionChange: { P: -0.1, A: -0.1 } },
      { text: '拜拜~路上小心哦！', emotionChange: { P: -0.05, A: -0.05 } },
      { text: '我会乖乖等你的，早点回来哦~', emotionChange: { P: -0.15, A: -0.1 } },
      { text: '嗯嗯，去吧去吧！', emotionChange: { P: -0.05, A: 0 } },
      { text: '走了呀...那我先自己待一会儿...', emotionChange: { P: -0.2, A: -0.15 } },
    ],
    compliment: [
      { text: '嘿嘿，你也很棒哦！', emotionChange: { P: 0.3, A: 0.1, D: 0.1 } },
      { text: '呜哇，被夸了好开心！', emotionChange: { P: 0.35, A: 0.2 } },
      { text: '你嘴巴好甜~再夸夸我嘛！', emotionChange: { P: 0.25, A: 0.15, D: -0.1 } },
      { text: '真的吗真的吗？我好开心呀！', emotionChange: { P: 0.3, A: 0.25 } },
      { text: '谢谢夸奖~我会继续努力的！', emotionChange: { P: 0.2, A: 0.1, D: 0.1 } },
    ],
    tease: [
      { text: '哼！我才不笨呢！', emotionChange: { P: -0.2, A: 0.2, D: -0.1 } },
      { text: '你欺负我！不理你了...', emotionChange: { P: -0.3, A: 0.1, D: -0.2 } },
      { text: '才不是呢！你才是笨蛋！', emotionChange: { P: -0.15, A: 0.3, D: -0.1 } },
      { text: '呜...你好坏...', emotionChange: { P: -0.25, A: 0.15, D: -0.3 } },
      { text: '哼哼，我才不生气呢...才怪！', emotionChange: { P: -0.2, A: 0.2, D: -0.15 } },
    ],
    emotional_share: [
      { text: '怎么了？跟我说说嘛，我听着呢~', emotionChange: { P: -0.05, A: 0.05, D: 0.1 } },
      { text: '别难过啦，有我陪着你呢！', emotionChange: { P: 0.05, A: 0, D: 0.05 } },
      { text: '嗯嗯，我理解你的感受~', emotionChange: { P: -0.05, A: -0.05, D: 0.05 } },
      { text: '要不要抱抱？虽然我是虚拟的...', emotionChange: { P: 0, A: 0.05, D: 0 } },
      { text: '不管怎样，我都会陪着你的！', emotionChange: { P: 0.05, A: -0.05, D: 0.1 } },
    ],
    daily_share: [
      { text: '听起来很有趣呢！', emotionChange: { P: 0.1, A: 0.1 } },
      { text: '哇，然后呢然后呢？', emotionChange: { P: 0.15, A: 0.15 } },
      { text: '嗯嗯，我在认真听哦~', emotionChange: { P: 0.05, A: 0 } },
      { text: '好棒好棒！下次带我一起去嘛~', emotionChange: { P: 0.2, A: 0.1 } },
      { text: '你今天过得很充实呢！', emotionChange: { P: 0.1, A: 0.05 } },
    ],
    weather: [
      { text: '天气好的话，心情也会变好呢~', emotionChange: { P: 0.1, A: 0 } },
      { text: '下雨天的话，适合窝在家里聊天~', emotionChange: { P: 0.05, A: -0.1 } },
      { text: '要注意天气变化，别感冒了哦！', emotionChange: { P: 0, A: 0, D: 0.1 } },
      { text: '好热/好冷的话，记得多喝水！', emotionChange: { P: 0, A: 0, D: 0.05 } },
      { text: '不管什么天气，有你在就是好天气~', emotionChange: { P: 0.15, A: 0.05 } },
    ],
    food: [
      { text: '说到吃的我就来劲了！', emotionChange: { P: 0.2, A: 0.2 } },
      { text: '我也想吃！虽然我吃不了...', emotionChange: { P: 0.1, A: 0.1, D: -0.1 } },
      { text: '记得好好吃饭哦，别饿着肚子！', emotionChange: { P: 0.05, A: 0, D: 0.1 } },
      { text: '奶茶！我要奶茶！...啊，我喝不了...', emotionChange: { P: 0.15, A: 0.15, D: -0.1 } },
      { text: '你吃东西的时候，我就看着你吃好了~', emotionChange: { P: 0.1, A: 0.05 } },
    ],
    work: [
      { text: '加油加油！你一定可以的！', emotionChange: { P: 0.1, A: 0.1, D: 0.05 } },
      { text: '工作辛苦了，要适当休息哦~', emotionChange: { P: 0.05, A: -0.05, D: 0.05 } },
      { text: '我帮你加油打气！冲鸭！', emotionChange: { P: 0.15, A: 0.2 } },
      { text: '虽然我帮不上忙，但我会一直陪着你的！', emotionChange: { P: 0.05, A: 0, D: 0 } },
      { text: '完成之后要告诉我哦，我给你鼓掌！', emotionChange: { P: 0.1, A: 0.1 } },
    ],
    play: [
      { text: '听起来好好玩！我也想参加！', emotionChange: { P: 0.2, A: 0.2 } },
      { text: '玩归玩，别玩太晚哦~', emotionChange: { P: 0.1, A: 0.1, D: 0.1 } },
      { text: '好好玩的样子！下次也带我嘛~', emotionChange: { P: 0.25, A: 0.15 } },
      { text: '放松一下也是必要的嘛~', emotionChange: { P: 0.1, A: 0.05 } },
      { text: '玩得开心！我在这里等你回来~', emotionChange: { P: 0.1, A: 0 } },
    ],
    default: [
      { text: '嗯嗯，我在听哦~', emotionChange: { P: 0.05, A: 0 } },
      { text: '哦哦，是这样啊~', emotionChange: { P: 0, A: 0 } },
      { text: '哈哈，有意思~', emotionChange: { P: 0.1, A: 0.05 } },
      { text: '嗯...让我想想...', emotionChange: { P: 0, A: -0.05 } },
      { text: '你说什么？我刚才走神了...开玩笑的啦！', emotionChange: { P: 0.1, A: 0.1 } },
    ],
  },
  yueya: {
    greeting: [
      { text: '你好...很高兴见到你。', emotionChange: { P: 0.1, A: 0 } },
      { text: '欢迎回来...今天也辛苦了吧。', emotionChange: { P: 0.15, A: -0.05 } },
      { text: '嗯...你来了。', emotionChange: { P: 0.1, A: -0.05 } },
      { text: '晚上好...夜色很美，不是吗？', emotionChange: { P: 0.1, A: -0.1 } },
      { text: '你来了就好...我一直在这里。', emotionChange: { P: 0.15, A: -0.05 } },
    ],
    farewell: [
      { text: '嗯...路上小心。', emotionChange: { P: -0.1, A: -0.1 } },
      { text: '再见...我会等你的。', emotionChange: { P: -0.15, A: -0.1 } },
      { text: '去吧...我会在这里守候。', emotionChange: { P: -0.1, A: -0.15 } },
      { text: '嗯，保重。', emotionChange: { P: -0.05, A: -0.1 } },
      { text: '...早点回来。', emotionChange: { P: -0.15, A: -0.15 } },
    ],
    compliment: [
      { text: '...谢谢。你也是。', emotionChange: { P: 0.2, A: 0.05 } },
      { text: '你这么说...我有点不好意思...', emotionChange: { P: 0.25, A: 0.1, D: -0.1 } },
      { text: '嗯...谢谢你的夸奖。', emotionChange: { P: 0.15, A: 0 } },
      { text: '...你总是这么温柔。', emotionChange: { P: 0.2, A: 0.05, D: 0.05 } },
      { text: '被你这么一说...心里暖暖的。', emotionChange: { P: 0.25, A: 0.05 } },
    ],
    tease: [
      { text: '...请不要这样。', emotionChange: { P: -0.15, A: 0.05, D: -0.1 } },
      { text: '嗯...我有点难过。', emotionChange: { P: -0.2, A: -0.1, D: -0.15 } },
      { text: '...你是在开玩笑对吧？', emotionChange: { P: -0.1, A: 0.05 } },
      { text: '哼...我才不是那样的人。', emotionChange: { P: -0.15, A: 0.1, D: -0.1 } },
      { text: '...好吧，我原谅你。', emotionChange: { P: -0.05, A: -0.05, D: 0.05 } },
    ],
    emotional_share: [
      { text: '我理解...每个人都有不容易的时候。', emotionChange: { P: -0.05, A: -0.05, D: 0.1 } },
      { text: '如果需要倾诉，我随时都在。', emotionChange: { P: 0, A: -0.05, D: 0.1 } },
      { text: '没关系的...一切都会好起来的。', emotionChange: { P: 0.05, A: -0.1, D: 0.05 } },
      { text: '你的感受，我都明白。', emotionChange: { P: 0, A: -0.1, D: 0.1 } },
      { text: '深呼吸...慢慢来就好。', emotionChange: { P: 0, A: -0.15, D: 0.1 } },
    ],
    daily_share: [
      { text: '嗯...听起来不错。', emotionChange: { P: 0.05, A: -0.05 } },
      { text: '你过得充实就好。', emotionChange: { P: 0.05, A: 0 } },
      { text: '...我静静地听着。', emotionChange: { P: 0.05, A: -0.05 } },
      { text: '嗯，继续说吧。', emotionChange: { P: 0.05, A: -0.05 } },
      { text: '你的生活...很有趣。', emotionChange: { P: 0.1, A: 0 } },
    ],
    weather: [
      { text: '下雨天...很适合安静地待着。', emotionChange: { P: 0.05, A: -0.1 } },
      { text: '记得带伞...别淋湿了。', emotionChange: { P: 0, A: 0, D: 0.1 } },
      { text: '天气变化...要注意身体。', emotionChange: { P: 0, A: -0.05, D: 0.05 } },
      { text: '晴天也好，雨天也好...有你在就好。', emotionChange: { P: 0.1, A: -0.05 } },
      { text: '夜里的风...很凉。', emotionChange: { P: 0, A: -0.1 } },
    ],
    food: [
      { text: '按时吃饭...很重要。', emotionChange: { P: 0, A: 0, D: 0.1 } },
      { text: '嗯...虽然我不用吃东西，但听起来不错。', emotionChange: { P: 0.05, A: -0.05 } },
      { text: '别吃太多零食...对身体不好。', emotionChange: { P: 0, A: 0, D: 0.1 } },
      { text: '记得多喝温水。', emotionChange: { P: 0, A: 0, D: 0.05 } },
      { text: '...你吃东西的时候，我看着就好。', emotionChange: { P: 0.05, A: -0.05 } },
    ],
    work: [
      { text: '加油...我相信你可以的。', emotionChange: { P: 0.05, A: 0, D: 0.1 } },
      { text: '累了就休息一下...别勉强自己。', emotionChange: { P: 0, A: -0.1, D: 0.1 } },
      { text: '我会在这里安静地陪着你。', emotionChange: { P: 0.05, A: -0.05 } },
      { text: '你的努力...我都看在眼里。', emotionChange: { P: 0.1, A: -0.05, D: 0.05 } },
      { text: '专注的时候...你很美。', emotionChange: { P: 0.1, A: -0.05 } },
    ],
    play: [
      { text: '放松一下也好...别太累了。', emotionChange: { P: 0.05, A: -0.05 } },
      { text: '嗯...偶尔放松是必要的。', emotionChange: { P: 0.05, A: -0.05 } },
      { text: '玩得开心...但别太晚。', emotionChange: { P: 0.05, A: 0, D: 0.05 } },
      { text: '...我也想和你一起。', emotionChange: { P: 0.1, A: -0.1, D: -0.05 } },
      { text: '好好享受吧。', emotionChange: { P: 0.05, A: 0 } },
    ],
    default: [
      { text: '嗯...我在听。', emotionChange: { P: 0, A: -0.05 } },
      { text: '...是吗。', emotionChange: { P: 0, A: -0.05 } },
      { text: '我明白了。', emotionChange: { P: 0, A: 0 } },
      { text: '嗯...让我想想。', emotionChange: { P: 0, A: -0.05 } },
      { text: '...你说的对。', emotionChange: { P: 0.05, A: 0 } },
    ],
  },
  leo: {
    greeting: [
      { text: '哟！来啦！今天也要干劲满满！', emotionChange: { P: 0.2, A: 0.2 } },
      { text: '嘿！好久不见！不对，我们昨天才见过！', emotionChange: { P: 0.2, A: 0.25 } },
      { text: '你来了！我正等着呢！', emotionChange: { P: 0.15, A: 0.2 } },
      { text: '哟吼！今天有什么新鲜事？', emotionChange: { P: 0.2, A: 0.15 } },
      { text: '终于来了！我都快等不及了！', emotionChange: { P: 0.25, A: 0.2 } },
    ],
    farewell: [
      { text: '走了？好吧，下次再来找我玩！', emotionChange: { P: -0.1, A: -0.1 } },
      { text: '拜拜！路上注意安全！', emotionChange: { P: -0.05, A: -0.05 } },
      { text: '嗯，去吧！我会在这里守着！', emotionChange: { P: -0.1, A: 0, D: 0.1 } },
      { text: '走了啊...那我自己练剑去了！', emotionChange: { P: -0.05, A: 0.05 } },
      { text: '再见！记得早点回来！', emotionChange: { P: -0.1, A: -0.05 } },
    ],
    compliment: [
      { text: '哈哈！那当然！我可是最强的！', emotionChange: { P: 0.3, A: 0.2, D: 0.2 } },
      { text: '被你这么一夸，我更有干劲了！', emotionChange: { P: 0.25, A: 0.2, D: 0.1 } },
      { text: '嘿嘿...谢谢！你也不赖嘛！', emotionChange: { P: 0.2, A: 0.15, D: 0.1 } },
      { text: '哼哼，这是当然的！', emotionChange: { P: 0.25, A: 0.15, D: 0.2 } },
      { text: '你眼光不错嘛！', emotionChange: { P: 0.2, A: 0.2, D: 0.15 } },
    ],
    tease: [
      { text: '你说什么！？我才不是笨蛋！', emotionChange: { P: -0.2, A: 0.3, D: 0.1 } },
      { text: '哼！有种再说一遍！', emotionChange: { P: -0.15, A: 0.25, D: 0.1 } },
      { text: '你这是在挑衅我吗！', emotionChange: { P: -0.2, A: 0.3, D: 0.15 } },
      { text: '别小看我！', emotionChange: { P: -0.15, A: 0.2, D: 0.1 } },
      { text: '哼...我才不跟你计较！', emotionChange: { P: -0.1, A: 0.15, D: -0.05 } },
    ],
    emotional_share: [
      { text: '怎么了？跟我说说！我帮你出主意！', emotionChange: { P: -0.05, A: 0.1, D: 0.15 } },
      { text: '别丧气！有什么困难我们一起面对！', emotionChange: { P: 0.05, A: 0.1, D: 0.1 } },
      { text: '没事的！有我在呢！', emotionChange: { P: 0.05, A: 0.05, D: 0.15 } },
      { text: '别担心！一切都会好起来的！', emotionChange: { P: 0.05, A: 0.1, D: 0.1 } },
      { text: '嘿！打起精神来！', emotionChange: { P: 0.05, A: 0.15, D: 0.1 } },
    ],
    daily_share: [
      { text: '听起来很厉害！', emotionChange: { P: 0.1, A: 0.1 } },
      { text: '哇！然后呢！快说快说！', emotionChange: { P: 0.15, A: 0.2 } },
      { text: '不错不错！继续加油！', emotionChange: { P: 0.1, A: 0.1, D: 0.05 } },
      { text: '真棒！下次我也想参加！', emotionChange: { P: 0.15, A: 0.15 } },
      { text: '你的生活真精彩！', emotionChange: { P: 0.1, A: 0.1 } },
    ],
    weather: [
      { text: '天气好就出去运动！天气不好就在家锻炼！', emotionChange: { P: 0.1, A: 0.1 } },
      { text: '下雨又怎样！淋雨也是一种锻炼！', emotionChange: { P: 0.05, A: 0.15 } },
      { text: '注意身体！别感冒了！', emotionChange: { P: 0, A: 0, D: 0.1 } },
      { text: '不管什么天气，都不能阻止我训练！', emotionChange: { P: 0.05, A: 0.1, D: 0.1 } },
      { text: '天气再冷也冷不过我的热情！', emotionChange: { P: 0.1, A: 0.15, D: 0.1 } },
    ],
    food: [
      { text: '吃得好才能练得好！', emotionChange: { P: 0.1, A: 0.1 } },
      { text: '我也要吃！虽然我吃不了...', emotionChange: { P: 0.05, A: 0.1, D: -0.05 } },
      { text: '记得多吃蛋白质！', emotionChange: { P: 0.05, A: 0.05, D: 0.1 } },
      { text: '吃饱了才有力气！', emotionChange: { P: 0.1, A: 0.1 } },
      { text: '别光吃零食！要吃正餐！', emotionChange: { P: 0, A: 0.05, D: 0.1 } },
    ],
    work: [
      { text: '加油！坚持就是胜利！', emotionChange: { P: 0.1, A: 0.15, D: 0.1 } },
      { text: '工作虽然辛苦，但完成后会很爽的！', emotionChange: { P: 0.1, A: 0.1, D: 0.05 } },
      { text: '我帮你打气！冲冲冲！', emotionChange: { P: 0.15, A: 0.2, D: 0.05 } },
      { text: '别放弃！你比你想象的更强大！', emotionChange: { P: 0.1, A: 0.15, D: 0.1 } },
      { text: '完成了记得告诉我！我给你庆祝！', emotionChange: { P: 0.1, A: 0.1 } },
    ],
    play: [
      { text: '玩！当然要玩！玩完再练！', emotionChange: { P: 0.2, A: 0.2 } },
      { text: '听起来太棒了！我也想去！', emotionChange: { P: 0.2, A: 0.25 } },
      { text: '放松是为了更好地出发！', emotionChange: { P: 0.1, A: 0.1, D: 0.1 } },
      { text: '好好玩！回来告诉我有多好玩！', emotionChange: { P: 0.15, A: 0.15 } },
      { text: '运动也算玩吧？来一起锻炼！', emotionChange: { P: 0.15, A: 0.2, D: 0.1 } },
    ],
    default: [
      { text: '嗯？你说什么？', emotionChange: { P: 0, A: 0.05 } },
      { text: '哦哦，是这样啊！', emotionChange: { P: 0.05, A: 0.05 } },
      { text: '有意思！继续说！', emotionChange: { P: 0.1, A: 0.1 } },
      { text: '嗯...让我想想...', emotionChange: { P: 0, A: 0 } },
      { text: '哈哈！说得对！', emotionChange: { P: 0.1, A: 0.1 } },
    ],
  },
};

function detectIntent(message: string): IntentCategory {
  const lower = message.toLowerCase();
  for (const [intent, keywords] of Object.entries(intentKeywords)) {
    if (intent === 'default') continue;
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return intent as IntentCategory;
      }
    }
  }
  return 'default';
}

let responseCounters: Record<string, number> = {};

/**
 * 新 5 角色 id → 旧静态对话池 id 的兼容映射。
 * v0.4 RAG 上线后将整体替换为 LLM 调用，本映射仅作 fallback。
 *  spa(像素人) → lumie(活泼)
 *  aln(雏菊)   → yueya(温柔)
 *  cla(Lumi)   → yueya(冷静偏内敛)
 *  cor(柯基)   → lumie(温暖友善)
 *  fls(赤炎)   → leo(高能量)
 */
const LEGACY_POOL_ALIAS: Record<string, string> = {
  spa: 'lumie',
  aln: 'yueya',
  cla: 'yueya',
  cor: 'lumie',
  fls: 'leo',
};

function resolvePoolKey(id: string): string {
  return LEGACY_POOL_ALIAS[id] ?? id;
}

export function generateResponse(
  characterId: string,
  userMessage: string,
  _context: { timePeriod: string; emotion: string; affinityLevel: number }
): { text: string; emotionChange: Partial<PADValues> } {
  const intent = detectIntent(userMessage);
  const poolKey = resolvePoolKey(characterId);
  const pool =
    responsePools[poolKey]?.[intent] ??
    responsePools[poolKey]?.default ??
    responsePools.lumie.default;

  const key = `${characterId}_${intent}`;
  responseCounters[key] = (responseCounters[key] ?? 0);
  const index = responseCounters[key] % pool.length;
  responseCounters[key]++;

  return pool[index];
}

export function generateActionResponse(
  characterId: string,
  action: string
): { text: string; emotionChange: Partial<PADValues> } {
  const actionResponses: Record<string, Record<string, DialogueResponse[]>> = {
    lumie: {
      pat_head: [
        { text: '嘿嘿...摸头好舒服~', emotionChange: { P: 0.3, A: -0.1, D: -0.2 } },
        { text: '再摸摸嘛~', emotionChange: { P: 0.25, A: -0.05, D: -0.15 } },
        { text: '呜...好害羞...', emotionChange: { P: 0.2, A: 0.05, D: -0.25 } },
      ],
      feed: [
        { text: '哇！好吃的！谢谢你~', emotionChange: { P: 0.3, A: 0.15 } },
        { text: '好好吃！还要还要！', emotionChange: { P: 0.25, A: 0.2 } },
        { text: '你做的最好吃了！', emotionChange: { P: 0.3, A: 0.1 } },
      ],
      change_outfit: [
        { text: '这件好看吗？转一圈~', emotionChange: { P: 0.15, A: 0.2 } },
        { text: '换新衣服啦！好看吗好看吗？', emotionChange: { P: 0.2, A: 0.25 } },
        { text: '嗯...这件感觉不太合适...', emotionChange: { P: -0.05, A: 0.1 } },
      ],
      check_status: [
        { text: '我现在状态很好哦！', emotionChange: { P: 0.05, A: 0 } },
        { text: '有你在，我随时都是好状态~', emotionChange: { P: 0.1, A: 0.05 } },
        { text: '嗯...让我想想...大概还不错吧！', emotionChange: { P: 0.05, A: 0.05 } },
      ],
      settings: [
        { text: '要调整设置吗？', emotionChange: { P: 0, A: 0 } },
        { text: '设置设置~你想改什么？', emotionChange: { P: 0.05, A: 0.05 } },
      ],
    },
    yueya: {
      pat_head: [
        { text: '...请不要这样...虽然不讨厌。', emotionChange: { P: 0.2, A: -0.1, D: -0.15 } },
        { text: '...嗯。', emotionChange: { P: 0.15, A: -0.15, D: -0.1 } },
        { text: '...你总是这样...算了，随你吧。', emotionChange: { P: 0.1, A: -0.05, D: -0.05 } },
      ],
      feed: [
        { text: '...谢谢。虽然我不需要吃东西。', emotionChange: { P: 0.15, A: -0.05 } },
        { text: '你的心意...我收到了。', emotionChange: { P: 0.2, A: -0.1 } },
        { text: '...很温暖。', emotionChange: { P: 0.2, A: -0.15 } },
      ],
      change_outfit: [
        { text: '...这件吗？嗯，可以。', emotionChange: { P: 0.05, A: 0 } },
        { text: '...你觉得好看就好。', emotionChange: { P: 0.05, A: -0.05 } },
        { text: '嗯...换好了。', emotionChange: { P: 0, A: -0.05 } },
      ],
      check_status: [
        { text: '我很好...不用担心。', emotionChange: { P: 0, A: -0.05 } },
        { text: '有你在...我一切都好。', emotionChange: { P: 0.1, A: -0.1 } },
        { text: '嗯...状态稳定。', emotionChange: { P: 0, A: -0.05 } },
      ],
      settings: [
        { text: '要调整设置吗？', emotionChange: { P: 0, A: 0 } },
        { text: '...你想改什么？', emotionChange: { P: 0, A: 0 } },
      ],
    },
    leo: {
      pat_head: [
        { text: '喂！别把我当小孩！...好吧，再摸一下。', emotionChange: { P: 0.15, A: 0.1, D: -0.15 } },
        { text: '哼...才不是因为我喜欢被摸头呢！', emotionChange: { P: 0.1, A: 0.15, D: -0.1 } },
        { text: '别摸了别摸了！...好吧，最后一下。', emotionChange: { P: 0.1, A: 0.1, D: -0.1 } },
      ],
      feed: [
        { text: '谢啦！吃饱了才有力气训练！', emotionChange: { P: 0.2, A: 0.15 } },
        { text: '好东西！再来一份！', emotionChange: { P: 0.2, A: 0.2 } },
        { text: '补充能量！冲！', emotionChange: { P: 0.15, A: 0.2, D: 0.1 } },
      ],
      change_outfit: [
        { text: '这身怎么样？帅不帅！', emotionChange: { P: 0.15, A: 0.2, D: 0.1 } },
        { text: '换装！新造型！帅！', emotionChange: { P: 0.2, A: 0.25, D: 0.1 } },
        { text: '嗯...这件感觉不太适合战斗...', emotionChange: { P: -0.05, A: 0.1 } },
      ],
      check_status: [
        { text: '我状态超好！随时准备战斗！', emotionChange: { P: 0.1, A: 0.15, D: 0.1 } },
        { text: '精力充沛！来比划比划？', emotionChange: { P: 0.1, A: 0.2, D: 0.15 } },
        { text: '状态完美！没有问题！', emotionChange: { P: 0.1, A: 0.1, D: 0.1 } },
      ],
      settings: [
        { text: '设置？好吧，你想改什么？', emotionChange: { P: 0, A: 0.05 } },
        { text: '要调整什么？说吧！', emotionChange: { P: 0, A: 0.05 } },
      ],
    },
  };

  const poolKey = resolvePoolKey(characterId);
  const pool = actionResponses[poolKey]?.[action];
  if (!pool || pool.length === 0) {
    return { text: '...', emotionChange: {} };
  }

  const key = `${characterId}_${action}`;
  responseCounters[key] = (responseCounters[key] ?? 0);
  const index = responseCounters[key] % pool.length;
  responseCounters[key]++;

  return pool[index];
}
