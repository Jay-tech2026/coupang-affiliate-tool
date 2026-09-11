const $ = (id) => document.getElementById(id); let products = [], links = [];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value).toLocaleString("zh-TW") : "—";
const ratingText = value => Number.isFinite(Number(value)) ? Number(value).toFixed(1) : "—";
const rankingNames = {scoreDesc:"酷澎綜合評分",saleCountDesc:"最熱銷"};
async function copyText(value,button){
  const originalLabel=button.textContent;
  try{
    await navigator.clipboard.writeText(value);
    button.textContent="已複製";
    setTimeout(()=>{button.textContent=originalLabel},1200);
  }catch(error){
    $("status").innerHTML=`<span class="error">複製失敗：${esc(error.message)}</span>`;
  }
}
const popularCategories = [
  {group:"美妝保養",label:"彩妝刷具",items:["眼影暈染刷具組","粉底液化妝刷","攜帶式蜜粉刷","斜角眉刷","鼻影修容刷","矽膠面膜刷","伸縮式唇刷","扇形打亮刷","美妝蛋粉撲組","刷具清潔海綿盒"]},
  {group:"美妝保養",label:"眼部彩妝",items:["大地色九宮格眼影盤","防水極細眼線液筆","纖長防水睫毛膏","臥蠶提亮筆","單色霧面眼影","眼影打底膏","自然款假睫毛","速乾睫毛定型液","雙頭眉筆眉刷","防水眼線膠筆"]},
  {group:"美妝保養",label:"唇部底妝",items:["霧面持色唇釉","水光玻璃唇釉","滋潤顯色唇膏","變色護唇膏","持妝氣墊粉餅","控油粉底液","雙色遮瑕膏","透明定妝蜜粉","保濕妝前乳","奶油腮紅膏"]},
  {group:"美妝保養",label:"臉部保養",items:["玻尿酸保濕精華","神經醯胺乳霜","積雪草舒緩面膜","清爽型臉部防曬乳","維他命C亮白精華","溫和去角質凝膠","毛孔緊緻化妝水","視黃醇晚霜","保濕噴霧","痘痘護理貼"]},
  {group:"美妝保養",label:"洗沐美髮",items:["胺基酸洗面乳","眼唇卸妝液","溫和卸妝膏","頭皮控油洗髮精","受損髮護髮膜","免沖洗護髮油","蓬鬆乾洗髮","香氛沐浴乳","身體去角質霜","高保濕護手霜"]},
  {group:"食品飲料",label:"咖啡茶飲",items:["無糖濾掛黑咖啡","即溶拿鐵咖啡包","冷泡烏龍茶包","無糖綠茶箱購","伯爵紅茶茶包","膠囊咖啡組","黑糖薑茶沖泡包","玄米茶包","決明子茶包","無咖啡因花草茶"]},
  {group:"食品飲料",label:"乳品飲料",items:["常溫全脂鮮乳箱","無添加無糖豆漿","氣泡礦泉水箱購","高鈣保久乳","無糖燕麥奶","低脂優酪乳","電解質補充飲料","100%純果汁箱","黑豆漿箱購","椰子水箱購"]},
  {group:"食品飲料",label:"休閒零食",items:["每日綜合堅果包","低卡海苔脆片","零糖蒟蒻果凍","高蛋白燕麥棒","非油炸薯條餅乾","黑巧克力片","米果綜合包","無調味腰果","果乾綜合包","起司夾心餅乾"]},
  {group:"食品飲料",label:"即食料理",items:["韓式袋裝泡麵組","常溫即食雞胸肉","沖泡式濃湯包","微波即食咖哩","常溫料理包","即食燕麥粥","冷凍水餃家庭包","義大利麵醬罐","鮪魚罐頭組","沖泡冬粉湯"]},
  {group:"食品飲料",label:"調味食材",items:["特級初榨橄欖油","薄鹽醬油","天然海鹽","無糖花生醬","蜂蜜隨身包","低筋麵粉","日式胡麻醬","韓式辣椒醬","香蒜胡椒鹽","玉米濃湯罐頭"]},
  {group:"居家清潔",label:"紙品濕巾",items:["三層抽取式衛生紙箱","可沖式濕式衛生紙","食品級廚房紙巾","加厚酒精清潔濕巾","三層捲筒衛生紙","袖珍面紙量販包","嬰兒柔濕巾箱購","靜電除塵紙補充包","一次性洗臉巾","寵物清潔濕紙巾"]},
  {group:"居家清潔",label:"洗衣清潔",items:["抗菌濃縮洗衣精","洗衣機槽清潔錠","貼身衣物手洗精","衣物芳香豆","低敏洗衣膠囊","氧系漂白粉","衣領袖口去漬劑","防染吸色片","柔軟精補充包","運動衣物洗衣精"]},
  {group:"居家清潔",label:"廚衛清潔",items:["重油污洗碗精","洗碗機清潔錠","小蘇打去污粉","浴室水垢清潔劑","馬桶清潔錠","排水管疏通劑","廚房拋棄式抹布","除霉凝膠","玻璃清潔噴霧","橘油萬用清潔劑"]},
  {group:"居家清潔",label:"居家收納",items:["抽屜分隔收納盒","真空衣物壓縮袋","浴室無痕置物架","床底扁平收納箱","透明鞋盒組","衣櫃吊掛收納袋","旋轉化妝品收納盒","桌面遙控器收納盒","折疊洗衣籃","廚房鍋蓋收納架"]},
  {group:"居家清潔",label:"寢具家飾",items:["天絲床包組","記憶枕頭","涼感保潔墊","遮光窗簾","防水床墊保潔墊","珊瑚絨毛毯","防滑浴室地墊","沙發抱枕套","可水洗薄被","飯店款浴巾組"]},
  {group:"3C家電",label:"手機充電",items:["65W USB-C快充頭","編織快充傳輸線","磁吸無線充電盤","行動電源10000mAh","三合一充電線","GaN氮化鎵充電器","車用快充充電器","手機充電底座","USB-C轉接頭","短線行動電源"]},
  {group:"3C家電",label:"手機配件",items:["防摔透明手機殼","滿版玻璃保護貼","磁吸手機指環","自拍藍牙遙控器","手機掛繩背帶","防水手機袋","手機鏡頭保護貼","桌上型手機支架","折疊自拍棒","手機散熱風扇"]},
  {group:"3C家電",label:"電腦周邊",items:["靜音無線滑鼠","USB-C多功能集線器","高速記憶卡128GB","筆電散熱支架","無線機械鍵盤","網路攝影機","降噪電腦耳麥","USB隨身碟256GB","大尺寸滑鼠墊","藍牙數字鍵盤"]},
  {group:"3C家電",label:"影音娛樂",items:["藍牙無線耳機","便攜藍牙喇叭","電視串流播放器","手機直播補光燈","桌上型麥克風","降噪頭戴式耳機","迷你投影機","電視聲霸喇叭","HDMI高速傳輸線","數位相框"]},
  {group:"3C家電",label:"生活家電",items:["無線手持吸塵器","智能溫控快煮壺","迷你除濕機","空氣循環扇","負離子吹風機","蒸氣掛燙機","電動刮鬍刀","電子體重計","超音波加濕器","USB桌上風扇"]},
  {group:"母嬰親子",label:"嬰兒清潔",items:["低敏嬰兒洗衣精","新生兒泡泡沐浴露","嬰兒手口濕紙巾","奶瓶清潔液","嬰兒洗髮沐浴二合一","嬰兒護膚乳液","嬰兒屁屁護理膏","奶瓶消毒錠","嬰兒棉花棒","新生兒紗布澡巾"]},
  {group:"母嬰親子",label:"餵食用品",items:["防漏學習水杯","矽膠分隔餐盤","奶瓶奶嘴組","嬰兒食物剪刀","保溫副食品罐","防水吃飯圍兜","奶粉分裝盒","兒童不鏽鋼餐具","副食品冷凍分裝盒","奶瓶瀝水架"]},
  {group:"母嬰親子",label:"育兒用品",items:["嬰兒防踢睡袋","兒童安全防撞條","尿布收納袋","嬰兒推車掛勾","兒童馬桶坐墊","嬰兒揹巾口水巾","防走失牽引繩","嬰兒指甲剪組","尿布更換墊","嬰兒安撫巾"]},
  {group:"母嬰親子",label:"兒童學習",items:["兒童磁性畫板","可水洗彩色筆組","益智拼圖玩具","注音識字卡","兒童黏土工具組","磁力積木片","兒童故事投影燈","九九乘法學習卡","兒童剪貼勞作組","液晶手寫板"]},
  {group:"寵物用品",label:"貓咪清潔",items:["除臭豆腐貓砂","低粉塵礦砂","松木貓砂","貓砂除臭珠","封閉式貓砂盆","貓砂鏟收納組","寵物環境除臭噴霧","貓用洗毛精","貓咪指甲剪","寵物除毛梳"]},
  {group:"寵物用品",label:"貓咪飲食",items:["貓咪肉泥零食","無穀貓飼料","貓咪主食罐","凍乾雞肉貓零食","化毛膏","貓咪潔牙零食","自動循環飲水機濾芯","不鏽鋼貓碗","貓草種植組","貓用營養膏"]},
  {group:"寵物用品",label:"狗狗用品",items:["犬用潔牙骨家庭包","寵物吸水尿墊","外出摺疊水碗","犬用胸背牽繩","狗狗零食雞肉乾","寵物拾便袋","狗狗洗毛精","犬用慢食碗","寵物車用安全帶","狗狗益智漏食玩具"]},
  {group:"寵物用品",label:"寵物玩具",items:["瓦楞紙貓抓板","逗貓羽毛棒","貓薄荷玩具","寵物發聲球","耐咬磨牙玩具","貓咪隧道","寵物嗅聞墊","自動逗貓球","寵物飛盤","貓抓柱"]},
  {group:"運動健康",label:"居家健身",items:["防滑加厚瑜珈墊","可調式啞鈴組","彈力阻力帶組","運動泡棉滾筒","摺疊健腹輪","門框單槓","瑜珈磚組","負重沙袋綁腿","跳繩計數器","握力器"]},
  {group:"運動健康",label:"健康管理",items:["上臂式血壓計","冷熱兩用敷袋","每日藥盒分裝盒","額溫槍","血氧濃度計","護腰支撐帶","蒸氣熱敷眼罩","人體工學坐墊","膝蓋護具","耳溫槍保護套"]},
  {group:"運動健康",label:"運動補給",items:["乳清蛋白隨身包","低糖電解質飲料","高蛋白能量棒","運動水壺","肌酸粉","無糖蛋白飲","B群維他命","魚油膠囊","綜合維他命","膳食纖維粉"]},
  {group:"運動健康",label:"戶外運動",items:["跑步腰包","運動快乾毛巾","自行車手機架","防曬運動帽","透氣護膝","自行車水壺架","運動壓縮腿套","夜跑反光背心","登山杖","游泳防水袋"]},
  {group:"服飾配件",label:"貼身衣物",items:["無痕冰絲內褲組","透氣運動短襪組","無鋼圈居家內衣","發熱保暖衣","莫代爾居家睡衣","抗菌船型襪","高腰塑身褲","涼感背心","純棉平口褲","保暖羊毛襪"]},
  {group:"服飾配件",label:"包款配件",items:["輕量尼龍側背包","防潑水後背包","多夾層卡片夾","帆布托特包","手機隨身小包","旅行證件包","零錢鑰匙包","大容量媽媽包","商務電腦包","運動束口袋"]},
  {group:"服飾配件",label:"時尚配件",items:["抗UV遮陽帽","皮革自動扣腰帶","偏光太陽眼鏡","簡約石英手錶","鈦鋼項鍊","抓夾髮飾組","真絲小方巾","防風保暖手套","耳環收納盒","棒球帽"]},
  {group:"服飾配件",label:"鞋類用品",items:["記憶鞋墊","防水鞋套","運動鞋清潔組","防磨腳後跟貼","彈性免綁鞋帶","除臭鞋粉","鞋用防水噴霧","皮鞋保養油","鞋子除濕袋","足弓支撐鞋墊"]},
  {group:"文具辦公",label:"書寫用品",items:["速乾中性筆組","柔色螢光筆組","自動鉛筆替芯組","防水姓名貼紙","油性奇異筆組","按壓式修正帶","可擦中性筆","雙頭麥克筆組","金屬自動鉛筆","便利貼組"]},
  {group:"文具辦公",label:"辦公收納",items:["多層文件收納盒","桌面電線整理夾","A4資料夾組","桌上型筆筒","名片收納冊","抽屜式桌面收納櫃","護貝膠膜","標籤貼紙機","金屬書擋","辦公文件風琴夾"]},
  {group:"文具辦公",label:"閱讀學習",items:["護眼閱讀燈","閱讀書架","降噪耳塞","計時番茄鐘","電子辭典保護套","索引標籤貼","閱讀放大鏡","學生計算機","錯題整理筆記本","英文單字卡"]},
  {group:"文具辦公",label:"電腦辦公",items:["筆電增高支架","人體工學滑鼠墊","螢幕增高架","鍵盤手托墊","USB桌上檯燈","視訊會議補光燈","線材固定理線器","辦公椅腰靠墊","防窺螢幕保護片","桌下耳機掛架"]},
  {group:"戶外旅行",label:"通勤用品",items:["抗UV晴雨兩用傘","不鏽鋼真空保溫杯","冰感防曬袖套","大容量折疊購物袋","防水通勤鞋套","反光雨衣","機車防曬裙","隨身摺疊扇","通勤證件伸縮扣","保溫便當袋"]},
  {group:"戶外旅行",label:"旅行收納",items:["旅行衣物收納袋組","行李箱電子秤","頸枕眼罩組","防水盥洗包","行李箱束帶","旅行分裝瓶組","護照證件收納包","折疊旅行衣架","一次性旅行毛巾","行李箱輪保護套"]},
  {group:"戶外旅行",label:"露營用品",items:["充電式露營燈","折疊露營椅","便攜卡式爐","防潮野餐墊","露營折疊桌","保冷冰袋","戶外營繩燈","鈦合金露營餐具","可折疊水桶","露營收納箱"]},
  {group:"戶外旅行",label:"防曬防蚊",items:["戶外防蚊液","防蚊貼片","物理防曬乳","涼感防曬面罩","遮陽漁夫帽","防蚊手環","曬後舒緩凝膠","高係數防曬噴霧","戶外驅蚊燈","抗UV折疊遮陽棚"]},
  {group:"汽車用品",label:"車內清潔",items:["車用吸塵器","汽車玻璃清潔劑","車內除塵黏膠","超細纖維洗車布","汽車皮革保養乳","車內除臭噴霧","輪胎清潔刷","洗車海綿組","車用垃圾桶","擋風玻璃油膜清潔劑"]},
  {group:"汽車用品",label:"行車配件",items:["磁吸車用手機架","胎壓偵測器","汽車椅背收納袋","行車紀錄器記憶卡","汽車安全帶護套","車門防撞條","汽車遮陽簾","車用藍牙接收器","後照鏡防雨膜","汽車緊急啟動電源"]},
  {group:"汽車用品",label:"機車用品",items:["機車手機架","機車座墊防曬套","騎士防水手套","安全帽除臭噴霧","機車置物掛勾","騎士防風面罩","安全帽藍牙耳機","機車行車記錄器","機車擦拭布","機車輪胎打氣機"]},
  {group:"廚房用品",label:"鍋具餐具",items:["不沾平底鍋","不鏽鋼湯鍋","矽膠料理夾","陶瓷餐盤組","不鏽鋼筷子組","耐熱玻璃量杯","可拆式料理剪刀","木柄鍋鏟","兒童餐具組","牛排刀叉組"]},
  {group:"廚房用品",label:"保鮮收納",items:["耐熱玻璃保鮮盒組","食品真空密封袋","冰箱分類收納盒","調味料密封罐","矽膠保鮮蓋","冷凍食材分裝盒","米桶防潮儲米箱","旋轉調味料架","蔬果瀝水保鮮盒","夾鏈保鮮袋"]},
  {group:"廚房用品",label:"烘焙料理",items:["氣炸鍋烘焙紙","矽膠烘焙墊","電子廚房秤","不鏽鋼打蛋盆","烘焙量匙組","蛋糕烤模","耐熱隔熱手套","手持打蛋器","麵包切片刀","料理溫度計"]}
];
const shuffled = values => {const copy=[...values];for(let i=copy.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;};
async function renderSuggestions(){
  const {suggestionHistory=[],suggestionGroupHistory=[]}=await chrome.storage.local.get(["suggestionHistory","suggestionGroupHistory"]);
  const allItems=popularCategories.flatMap(category=>category.items.map(name=>({group:category.group,label:category.label,name})));
  const allGroups=[...new Set(popularCategories.map(category=>category.group))];
  let activeHistory=[...suggestionHistory];
  let usedItems=new Set(activeHistory);
  let freshGroups=allGroups.filter(group=>allItems.some(item=>item.group===group&&!usedItems.has(item.name)));
  if(freshGroups.length<5){activeHistory=suggestionHistory.slice(-5);usedItems=new Set(activeHistory);freshGroups=[...allGroups];}
  const previousGroups=new Set(suggestionGroupHistory.slice(-5));
  let groupPool=freshGroups.filter(group=>!previousGroups.has(group));
  if(groupPool.length<5)groupPool=freshGroups;
  const chosenGroups=shuffled(groupPool).slice(0,5);
  const lastFive=new Set(suggestionHistory.slice(-5));
  const choices=chosenGroups.map(group=>{
    const groupItems=allItems.filter(item=>item.group===group);
    let candidates=groupItems.filter(item=>!usedItems.has(item.name));
    if(!candidates.length)candidates=groupItems.filter(item=>!lastFive.has(item.name));
    return shuffled(candidates.length?candidates:groupItems)[0];
  });
  await chrome.storage.local.set({suggestionHistory:[...activeHistory,...choices.map(item=>item.name)].slice(-allItems.length),suggestionGroupHistory:[...suggestionGroupHistory,...chosenGroups].slice(-20)});
  $("suggestions").innerHTML=choices.map(item=>`<button type="button" data-example="${esc(item.name)}" title="${esc(item.group)}｜${esc(item.label)}">${esc(item.name)}</button>`).join("");
  $("suggestions").querySelectorAll("button[data-example]").forEach(button=>button.addEventListener("click",()=>{$("keywords").value=button.dataset.example;$("keywords").focus();}));
}
renderSuggestions();
async function renderHistory(){
  const {searchHistory=[]}=await chrome.storage.local.get("searchHistory");
  $("history").innerHTML=searchHistory.length?searchHistory.map((row,index)=>{const valid=Array.isArray(row.products)&&row.priceSchema===2&&row.ratingSchema===1;const source=(row.sorters||["scoreDesc","saleCountDesc"]).map(sorter=>rankingNames[sorter]).filter(Boolean).join("＋");return `<button type="button" class="history-row" data-history="${index}" ${valid?"":"disabled"}><div class="history-main">${esc(row.keywords.join("、"))}</div><div class="history-meta">${esc(row.time)} · ${esc(source)} · 折扣 ${row.minDiscount}% 以上 · 評價大於 ${row.minReviews} · ${row.count} 項${valid?" · 點擊直接還原":Array.isArray(row.products)?" · 舊紀錄沒有星數，需重新搜尋一次":" · 舊紀錄無快取"}</div></button>`}).join(""):'<span class="status">尚無搜尋紀錄</span>';
  $("history").querySelectorAll("button[data-history]").forEach(button=>button.addEventListener("click",()=>restoreHistory(searchHistory[+button.dataset.history])));
}
function restoreHistory(row){
  if(!Array.isArray(row.products))return;
  const savedSorters=row.sorters||["scoreDesc","saleCountDesc"];
  products=row.products;links=[];$("keywords").value=row.keywords.join(", ");$("min").value=row.minDiscount;$("reviews").value=row.minReviews;$("rank-score").checked=savedSorters.includes("scoreDesc");$("rank-sales").checked=savedSorters.includes("saleCountDesc");$("csv").disabled=true;render();$("status").textContent=`已從紀錄還原 ${products.length} 項商品，未重新搜尋。`;
  window.scrollTo({top:0,behavior:"smooth"});
}
async function saveHistory(entry){
  const {searchHistory=[]}=await chrome.storage.local.get("searchHistory");
  await chrome.storage.local.set({searchHistory:[entry,...searchHistory].slice(0,10)});
  await renderHistory();
}
renderHistory();
chrome.runtime.onMessage.addListener(message=>{if(message.type==="searchProgress") $("status").textContent=`搜尋「${message.keyword}」— ${message.rankingLabel}：第 ${message.page}/${message.totalPages} 頁…`;});
function updateBatch(){ $("links").disabled=!document.querySelector('input[data-i]:checked'); }
function renderInlineLinks(){
  products.forEach((product,index)=>{
    const output=$("items").querySelector(`[data-short-output="${index}"]`);if(!output)return;
    const link=links.find(item=>item.productUrl===product.url);output.innerHTML=link?`<div class="short-row"><a href="${esc(link.affiliateUrl)}" target="_blank" rel="noopener" data-short-url="${esc(link.affiliateUrl)}" title="點擊或按 Enter 在新分頁開啟">開啟短網址：${esc(link.affiliateUrl)}</a><button type="button" class="copy-button" data-copy-short="${index}">複製短網址</button></div>`:"";
  });
  $("items").querySelectorAll("a[data-short-url]").forEach(link=>link.addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();chrome.tabs.create({url:link.dataset.shortUrl,active:true});}}));
  $("items").querySelectorAll("button[data-copy-short]").forEach(button=>button.addEventListener("click",()=>{const product=products[+button.dataset.copyShort];const link=links.find(item=>item.productUrl===product.url);if(link)copyText(link.affiliateUrl,button)}));
}
function render(){
  products.sort((a,b)=>Number(b.discount||0)-Number(a.discount||0)||(b.rankings?.length||0)-(a.rankings?.length||0)||Number(b.reviewCount||0)-Number(a.reviewCount||0));
  $("items").innerHTML=products.map((p,i)=>`<div class="item"><input type="checkbox" data-i="${i}" aria-label="選取 ${esc(p.name)}"><img src="${esc(p.image)}"><span><span class="name">${esc(p.name)}</span><button type="button" class="copy-button" data-copy-name="${i}">複製品名</button><br><span class="deal">${p.discount}% OFF · 折扣前 $${money(p.originalPrice)} · 折扣後 $${money(p.price)} · ⭐ ${ratingText(p.rating)} · ${Number(p.reviewCount).toLocaleString()} 則評價</span>${p.rankings?.length?`<br><span class="ranking">來源：${esc(p.rankings.join(" ＋ "))}</span>`:""}</span><button class="one" data-short="${i}">產生短網址</button><div class="item-short" data-short-output="${i}"></div></div>`).join("");
  $("items").querySelectorAll('input[data-i]').forEach(x=>x.addEventListener('change',updateBatch));
  $("items").querySelectorAll('button[data-short]').forEach(x=>x.addEventListener('click',()=>convert([products[+x.dataset.short]],x)));
  $("items").querySelectorAll('button[data-copy-name]').forEach(button=>button.addEventListener('click',()=>copyText(products[+button.dataset.copyName].name,button)));
  renderInlineLinks();
  updateBatch();
}
async function convert(selected, button){
  try{
    if(!selected.length) throw new Error("請先自行勾選商品");
    if(button) button.disabled=true;
    $("status").textContent="正在產生 coupa.ng 短網址…";
    const d=await chrome.runtime.sendMessage({type:"deeplinks",urls:selected.map(x=>x.url)});
    if(!d?.ok) throw new Error(d?.error||"短網址 API 沒有回應");
    const created=d.links.map((x,i)=>({...x,productUrl:selected[i].url,name:selected[i].name,discount:selected[i].discount,rating:selected[i].rating,reviewCount:selected[i].reviewCount,originalPrice:selected[i].originalPrice,price:selected[i].price,image:selected[i].image,rankings:selected[i].rankings}));
    if(!created.every(x=>/^https:\/\/coupa\.ng\//.test(x.affiliateUrl))) throw new Error("API 未回傳 coupa.ng 短網址");
    const known=new Map(links.map(x=>[x.productUrl,x]));created.forEach(x=>known.set(x.productUrl,x));links=[...known.values()];renderInlineLinks();
    $("csv").disabled=false; $("status").textContent=`已產生 ${created.length} 個官方短網址`;
  }catch(e){ $("status").innerHTML=`<span class="error">${esc(e.message)}</span>`; }
  finally{ if(button) button.disabled=false; }
}
$("search").onclick=()=>{
  const min=Math.max(1,Math.min(99,Number($("min").value)||60));
  const minReviews=Math.max(0,Number($("reviews").value)||200);
  const keywords=$("keywords").value.split(",").map(x=>x.trim()).filter(Boolean);
  const sorters=[];if($("rank-score").checked)sorters.push("scoreDesc");if($("rank-sales").checked)sorters.push("saleCountDesc");
  if(!keywords.length){$("status").innerHTML='<span class="error">請輸入商品名稱，或點選一個隨機參考名稱。</span>';return}
  if(!sorters.length){$("status").innerHTML='<span class="error">請至少選擇「酷澎綜合評分」或「最熱銷」。</span>';return}
  $("status").textContent=`正在搜尋 ${keywords.length} 組關鍵字、${sorters.length} 種排序；每頁會等待商品載入…`;$("search").disabled=true;
  chrome.runtime.sendMessage({type:"search",minDiscount:min,minReviews,keywords,sorters},async r=>{
    $("search").disabled=false;
    if(chrome.runtime.lastError){$("status").innerHTML=`<span class="error">${esc(chrome.runtime.lastError.message)}</span>`;return}
    if(!r?.ok){$("status").innerHTML=`<span class="error">${esc(r?.error||"搜尋失敗")}</span>`;return}
    products=r.products;links=[];$("csv").disabled=true;render();
    const sourceSummary=sorters.map(sorter=>`${rankingNames[sorter]}：已搜尋，${r.sourceCounts?.[sorter]||0} 項符合門檻`).join("；");
    await saveHistory({time:new Date().toLocaleString("zh-TW"),keywords,minDiscount:min,minReviews,sorters,sourceCounts:r.sourceCounts,count:products.length,products,priceSchema:2,ratingSchema:1});
    $("status").textContent=`${sourceSummary}；合併去重後 ${products.length} 項。門檻為折扣 ${min}% 以上、評價大於 ${minReviews}。`;
  });
};
document.addEventListener("keydown",event=>{
  if(event.key!=="Enter"||event.isComposing||event.defaultPrevented)return;
  // Keep Enter's native action for links, buttons and ranking checkboxes.
  // Everywhere else on the tool page, Enter starts the search.
  if(event.target.closest('a[data-short-url],button,input[type="checkbox"]'))return;
  event.preventDefault();
  if(!$("search").disabled)$("search").click();
});
$("links").onclick=()=>convert([...document.querySelectorAll('input[data-i]:checked')].map(x=>products[+x.dataset.i]));
$("csv").onclick=()=>{const q=v=>'"'+String(v??"").replaceAll('"','""')+'"';const text="\uFEFF商品名稱,來源排序,折扣率,評價星數,評價數,折扣前價格,折扣後價格,原始網址,官方短網址\r\n"+links.map(x=>[x.name,(x.rankings||[]).join("＋"),x.discount,x.rating,x.reviewCount,x.originalPrice,x.price,x.originalUrl,x.affiliateUrl].map(q).join(",")).join("\r\n");chrome.downloads.download({url:URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"})),filename:`coupang-${new Date().toISOString().slice(0,10)}.csv`,saveAs:true});};
