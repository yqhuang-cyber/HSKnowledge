<script setup>
const missions = [
  ['M1-Making Friends', '问候/介绍自己/感谢告别'],
  ['M2-Making New Friends', '问名字/介绍他人/说"很高兴认识"'],
  ['M3-Finding Teacher Wang', '问身份/说是某人/道歉'],
  ['M4-Meeting Friends', '问国籍/说自己来自/介绍朋友'],
  ['M5-Cracking Numbers', '数字识别/数字规律/大数字'],
  ['M6-Staying Connected', '电话号码/确认号码'],
  ['M7-Remembering Special Days', '日期/年月日'],
  ['M8-Finding Time Together', '星期/忙/不忙'],
  ['M9-Meet My Family', '介绍家人/家庭成员'],
  ['M10-Getting to Know Family', '年龄/学生类别/家庭角色'],
  ['M11-Meeting Our New Friends', '宠物/指向/喜欢'],
  ['M12-Whose Is It?', '所属/群体/性别'],
  ['M13-Cracking the Time Code', '钟点/半/分'],
  ['M14-Unlocking My Day', '日常活动/学校工作'],
  ['M15-Plan the School Day', '课程表/时间规划'],
  ['M16-Finding Best Way', '交通方式/出行'],
  ['M17-Finding Each Other', '打电话/位置'],
  ['M18-Missing Things', '物品位置/方位词'],
  ['M19-Making Plan Work', '邀请/改时间'],
  ['M20-Discovering Food', '食物/偏好/喜欢'],
  ['M21-Ordering My Meal', '点餐/要/不要'],
  ['M22-Cooking for Friends', '会/能/可以/做饭'],
  ['M23-Getting Ready for Dinner', '购物清单/数量'],
  ['M24-Finding Best Buy', '价格/比较/意见'],
  ['M25-When Plans Change', '天气/改变计划'],
  ['M26-Helping Friend', '生病/医生/休息'],
  ['M27-Discovering Hobbies', '爱好/喜欢/兴趣'],
  ['M28-Planning Weekend', '协调/时间安排'],
  ['M29-Welcoming New Friend', '介绍学习生活/住'],
  ['M30-My Chinese Journey', '旅行/过去现在未来'],
]
</script>

<template>
  <div class="section">
    <h2>Kai HSK1 30 Missions 课程映射</h2>
    <p class="muted" style="margin-bottom: 16px">
      Kai HSK1 是优秀的听说训练材料，但只有
      <strong>47% 词汇覆盖</strong>、<strong>0% 显式语法</strong>、<strong>0% 汉字</strong>。建议作为综合
      HSK1 课程的<strong>听说模块</strong>使用。
    </p>
    <h3 style="margin: 16px 0 8px">课程任务到知识图谱的映射</h3>
    <table>
      <tr>
        <th style="width: 200px">任务</th>
        <th>主题</th>
      </tr>
      <tr v-for="[mission, theme] in missions" :key="mission">
        <td>{{ mission }}</td>
        <td>{{ theme }}</td>
      </tr>
    </table>
  </div>
</template>
