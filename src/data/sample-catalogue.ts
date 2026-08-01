import type { Question, Quiz } from "@/lib/types";

type Fact = [prompt: string, correct: string, wrong: string[], explanation: string];

const source = {
  curriculum: "Chương trình GDPT 2018 — Bộ Giáo dục và Đào tạo",
  cefr: "CEFR Companion Volume — Council of Europe",
  nasa: "NASA Science — Solar System Facts",
  cisa: "CISA — Secure Our World",
};

function choice(fact: Fact, topic: string, sourceRef = source.curriculum): Question {
  const [text, correct, wrong, explanation] = fact;
  return {
    type: "single_choice",
    text,
    timeLimit: 25,
    points: 1000,
    answers: [correct, ...wrong].map((answer, index) => ({ text: answer, correct: index === 0 })),
    explanation,
    hint: `Hãy loại dần các phương án chưa phù hợp với chủ đề ${topic}.`,
    difficulty: "easy",
    topics: [topic],
    status: "approved",
    origin: "manual",
    sourceRefs: [sourceRef],
  };
}

function quiz(title: string, subject: string, index: number, questions: Question[]): Quiz {
  return {
    title: `${title} · Đề ${String(index + 1).padStart(2, "0")}`,
    description: `Đề mẫu 5 câu về ${title.toLocaleLowerCase("vi")}, có đáp án và giải thích để học nhanh.`,
    version: 1,
    tags: [subject, title, "Kho đề mẫu"],
    questions,
  };
}

function fiveQuizzes(title: string, subject: string, facts: Fact[], sourceRef?: string): Quiz[] {
  return Array.from({ length: 5 }, (_, setIndex) =>
    quiz(
      title,
      subject,
      setIndex,
      facts.slice(setIndex * 5, setIndex * 5 + 5).map((fact) => choice(fact, title, sourceRef)),
    ),
  );
}

function mathQuizzes(kind: "Cộng trừ" | "Nhân chia" | "Phân số" | "Hình học" | "Tỉ lệ phần trăm" | "Đại số"): Quiz[] {
  return Array.from({ length: 5 }, (_, setIndex) => {
    const questions = Array.from({ length: 5 }, (_, questionIndex) => {
      const n = setIndex * 5 + questionIndex + 1;
      let fact: Fact;
      if (kind === "Cộng trừ") {
        const a = 24 + n * 3, b = 7 + n;
        fact = [`${a} - ${b} bằng bao nhiêu?`, String(a - b), [String(a + b), String(a - b + 2), String(a - b - 3)], `${a} - ${b} = ${a - b}.`];
      } else if (kind === "Nhân chia") {
        const a = 3 + (n % 9), b = 4 + (n % 7), product = a * b;
        fact = [`${product} : ${a} bằng bao nhiêu?`, String(b), [String(a), String(b + 1), String(Math.max(1, b - 2))], `Vì ${a} × ${b} = ${product} nên ${product} : ${a} = ${b}.`];
      } else if (kind === "Phân số") {
        const d = 4 + (n % 7), x = 1 + (n % (d - 1));
        fact = [`Phân số ${x}/${d} nhân cả tử và mẫu với 2 được phân số nào?`, `${x * 2}/${d * 2}`, [`${x + 2}/${d + 2}`, `${x}/${d * 2}`, `${x * 2}/${d}`], `Nhân cả tử và mẫu với cùng một số khác 0 tạo phân số bằng nhau.`];
      } else if (kind === "Hình học") {
        const length = 5 + n, width = 2 + (n % 5);
        fact = [`Hình chữ nhật dài ${length} cm, rộng ${width} cm có chu vi là?`, `${2 * (length + width)} cm`, [`${length * width} cm`, `${length + width} cm`, `${2 * length + width} cm`], `Chu vi = 2 × (${length} + ${width}) = ${2 * (length + width)} cm.`];
      } else if (kind === "Tỉ lệ phần trăm") {
        const percent = [10, 20, 25, 40, 50][n % 5], base = 40 + n * 4;
        const answer = (base * percent) / 100;
        fact = [`${percent}% của ${base} là bao nhiêu?`, String(answer), [String(answer + 4), String(base - answer), String(percent)], `${base} × ${percent}/100 = ${answer}.`];
      } else {
        const x = 2 + n, add = 3 + (n % 8), total = x + add;
        fact = [`Tìm x: x + ${add} = ${total}.`, String(x), [String(total + add), String(add), String(x + 2)], `Chuyển ${add} sang vế phải: x = ${total} - ${add} = ${x}.`];
      }
      return choice(fact, kind);
    });
    return quiz(`Toán · ${kind}`, "Toán", setIndex, questions);
  });
}

const vocabulary: Fact[] = [
  ["Choose the word meaning 'gia đình'.", "family", ["weather", "ticket", "garden"], "Family means gia đình."],
  ["Choose the opposite of 'big'.", "small", ["long", "fast", "warm"], "Small is the opposite of big."],
  ["Which word names a place to borrow books?", "library", ["bakery", "station", "hospital"], "A library lends books."],
  ["Which word means 'bữa sáng'?", "breakfast", ["lunch", "dinner", "dessert"], "Breakfast is the first meal of the day."],
  ["Which word is a colour?", "purple", ["pencil", "people", "pocket"], "Purple is a colour."],
  ["Choose the opposite of 'early'.", "late", ["near", "open", "slow"], "Late is the opposite of early."],
  ["Which word is a means of transport?", "bicycle", ["kitchen", "teacher", "window"], "A bicycle is used for transport."],
  ["What do we call a person who teaches?", "teacher", ["student", "driver", "doctor"], "A teacher helps learners study."],
  ["Which word means 'khát nước'?", "thirsty", ["hungry", "sleepy", "angry"], "Thirsty means needing a drink."],
  ["Which word is related to weather?", "cloudy", ["friendly", "careful", "quietly"], "Cloudy describes a sky with clouds."],
  ["Choose the opposite of 'expensive'.", "cheap", ["heavy", "busy", "empty"], "Cheap means costing little money."],
  ["Which room is used for cooking?", "kitchen", ["bedroom", "bathroom", "garage"], "People cook in a kitchen."],
  ["Which word means 'hàng xóm'?", "neighbour", ["passenger", "customer", "visitor"], "A neighbour lives near you."],
  ["What do you wear on your feet?", "shoes", ["gloves", "hat", "scarf"], "Shoes protect your feet."],
  ["Which word describes food that tastes good?", "delicious", ["dangerous", "difficult", "different"], "Delicious means very pleasant to taste."],
  ["Choose the opposite of 'noisy'.", "quiet", ["bright", "crowded", "strong"], "Quiet means making little noise."],
  ["Which place do airplanes use?", "airport", ["bridge", "museum", "market"], "Airplanes arrive at and leave an airport."],
  ["Which word means 'sức khỏe'?", "health", ["height", "heart", "habit"], "Health means the state of being well."],
  ["What do we use to tell the time?", "clock", ["plate", "blanket", "brush"], "A clock shows the time."],
  ["Which word means 'kỳ nghỉ'?", "holiday", ["homework", "hobby", "hospital"], "A holiday is time away from work or school."],
  ["Choose the opposite of 'full'.", "empty", ["wide", "deep", "soft"], "Empty is the opposite of full."],
  ["Which animal gives us wool?", "sheep", ["chicken", "horse", "duck"], "Wool commonly comes from sheep."],
  ["Which word is a fruit?", "orange", ["onion", "carrot", "potato"], "An orange is a citrus fruit."],
  ["What do we call a short journey for pleasure?", "trip", ["team", "test", "task"], "A trip is a journey or visit."],
  ["Which word means 'cẩn thận'?", "careful", ["colourful", "comfortable", "crowded"], "Careful means taking care to avoid mistakes or danger."],
];

const grammar: Fact[] = [
  ["She ___ to school every day.", "goes", ["go", "going", "gone"], "Use goes with third-person singular in the present simple."],
  ["They ___ football yesterday.", "played", ["play", "plays", "playing"], "Yesterday signals the past simple."],
  ["I have ___ apple.", "an", ["a", "the two", "some a"], "Use an before a vowel sound."],
  ["There ___ two books on the desk.", "are", ["is", "am", "be"], "Use are with a plural noun."],
  ["This bag is ___ than mine.", "heavier", ["heavy", "heaviest", "more heavy"], "Use the comparative heavier with than."],
  ["We ___ dinner now.", "are eating", ["eat yesterday", "eats", "ate now"], "Now signals the present continuous."],
  ["___ you like some tea?", "Would", ["Did", "Has", "Are"], "Would you like...? is a polite offer."],
  ["He can ___ very well.", "swim", ["swims", "swimming", "swam"], "A modal verb is followed by the base verb."],
  ["I ___ never been to Japan.", "have", ["has", "am", "did"], "Use have with I in the present perfect."],
  ["The cat is ___ the table.", "under", ["during", "until", "because"], "Under expresses position below something."],
  ["How ___ milk do you need?", "much", ["many", "often", "long"], "Milk is uncountable, so use much."],
  ["How ___ students are there?", "many", ["much", "far", "old"], "Students are countable, so use many."],
  ["My sister is good ___ drawing.", "at", ["on", "to", "for"], "The fixed phrase is good at."],
  ["We stayed home ___ it was raining.", "because", ["but", "or", "than"], "Because introduces a reason."],
  ["You ___ wear a helmet when riding.", "should", ["shouldn't to", "are", "did"], "Should expresses advice."],
  ["This is the ___ building here.", "tallest", ["taller", "tall", "more tall"], "The superlative tallest follows the."],
  ["I get up ___ seven o'clock.", "at", ["in", "on", "from"], "Use at with clock times."],
  ["Her birthday is ___ Monday.", "on", ["at", "in", "by"], "Use on with days."],
  ["We travel ___ summer.", "in", ["on", "at", "of"], "Use in with seasons."],
  ["The plural of 'child' is ___.", "children", ["childs", "childes", "childrens"], "Children is the irregular plural."],
  ["I don't have ___ money.", "any", ["some a", "many", "an"], "Any is common in negative sentences."],
  ["Please speak ___.", "slowly", ["slow", "slower noun", "slowness"], "An adverb modifies the verb speak."],
  ["The book ___ by millions of people.", "is read", ["reads", "is reading it", "read is"], "The passive form is be + past participle."],
  ["If it rains, we ___ inside.", "will stay", ["stayed yesterday", "staying", "stays we"], "The first conditional uses will in the result clause."],
  ["Could you tell me ___ the station is?", "where", ["what time did", "which is it", "who"], "Where asks about location in an indirect question."],
];

const vietnamese: Fact[] = [
  ["Từ nào là danh từ?", "học sinh", ["chạy", "đẹp", "nhanh"], "Học sinh là từ chỉ người."],
  ["Từ nào là động từ?", "đọc", ["sách", "xanh", "rất"], "Đọc chỉ hoạt động."],
  ["Từ nào là tính từ?", "chăm chỉ", ["bạn bè", "học", "và"], "Chăm chỉ chỉ đặc điểm."],
  ["Từ nào viết đúng chính tả?", "sắp xếp", ["sắp sếp", "xắp xếp", "xắp sếp"], "Cách viết đúng là sắp xếp."],
  ["Câu nào là câu hỏi?", "Bạn đã làm bài chưa?", ["Bạn hãy làm bài.", "Bạn làm bài rất tốt.", "Ôi, bài hay quá!"], "Dấu hỏi và mục đích hỏi giúp nhận diện câu hỏi."],
  ["Từ đồng nghĩa với 'siêng năng' là?", "chăm chỉ", ["lười biếng", "ồn ào", "chậm chạp"], "Siêng năng và chăm chỉ gần nghĩa."],
  ["Từ trái nghĩa với 'dũng cảm' là?", "nhút nhát", ["gan dạ", "can đảm", "kiên cường"], "Nhút nhát trái nghĩa với dũng cảm."],
  ["Trong 'mặt trời như quả cầu lửa', biện pháp nào được dùng?", "so sánh", ["nhân hóa", "điệp ngữ", "nói giảm"], "Từ 'như' tạo phép so sánh."],
  ["Từ nào là đại từ?", "tôi", ["bàn", "viết", "vui"], "Tôi dùng để xưng hô, thay cho người nói."],
  ["Cặp từ nào là từ láy?", "long lanh", ["xe đạp", "bút mực", "nhà cửa"], "Long lanh có sự lặp lại âm đầu."],
  ["Chủ ngữ trong câu 'Lan đọc sách' là?", "Lan", ["đọc", "sách", "đọc sách"], "Lan là người thực hiện hoạt động."],
  ["Vị ngữ trong câu 'Trời hôm nay rất đẹp' là?", "hôm nay rất đẹp", ["Trời", "hôm nay", "rất"], "Vị ngữ nêu đặc điểm của chủ ngữ Trời."],
  ["Dấu nào kết thúc câu cảm thán?", "!", ["?", ":", ";"], "Dấu chấm than thường kết thúc câu cảm thán."],
  ["Từ nào là từ ghép?", "quần áo", ["lung linh", "lấp lánh", "rì rào"], "Quần và áo đều có nghĩa, kết hợp thành từ ghép."],
  ["Câu nào có nhân hóa?", "Hàng cây dang tay đón gió.", ["Cây cao mười mét.", "Lá cây màu xanh.", "Có ba hàng cây."], "'Dang tay đón' là hoạt động của người được gán cho cây."],
  ["Thành ngữ nào nói về tinh thần đoàn kết?", "Một cây làm chẳng nên non", ["Có công mài sắt", "Đi một ngày đàng", "Đói cho sạch"], "Câu này đề cao sức mạnh hợp tác."],
  ["Từ nào có tiếng 'học' mang nghĩa học tập?", "học hỏi", ["học lỏm màu", "hóc xương", "hộc bàn"], "Học hỏi là tiếp thu kiến thức và kinh nghiệm."],
  ["Câu nào dùng dấu phẩy đúng?", "Lan, Mai và Hoa cùng trực nhật.", ["Lan Mai, và Hoa cùng trực nhật.", "Lan Mai và, Hoa cùng trực nhật.", "Lan Mai và Hoa, cùng trực nhật."], "Dấu phẩy tách thành phần liệt kê."],
  ["Từ nào chỉ đặc điểm âm thanh?", "êm dịu", ["tiếng hát", "ca hát", "người hát"], "Êm dịu mô tả đặc điểm âm thanh."],
  ["Câu 'Em bé cười' thuộc kiểu nào?", "Ai làm gì?", ["Ai là gì?", "Ai thế nào?", "Ở đâu?"], "Em bé là chủ thể, cười là hoạt động."],
  ["Từ nào viết đúng?", "trân trọng", ["chân trọng", "trân chọng", "chân chọng"], "Cách viết đúng là trân trọng."],
  ["Bộ phận trả lời 'ở đâu?' trong 'Em học ở trường' là?", "ở trường", ["Em", "học", "Em học"], "Ở trường nêu địa điểm."],
  ["Từ 'ăn' trong 'tàu ăn than' được dùng theo nghĩa nào?", "nghĩa chuyển", ["nghĩa gốc", "từ đồng âm", "từ láy"], "Tàu không ăn như người; 'ăn' mang nghĩa tiêu thụ nhiên liệu."],
  ["Câu nào là câu cầu khiến?", "Hãy giữ trật tự!", ["Bạn đang giữ trật tự.", "Bạn có giữ trật tự không?", "Trật tự thật tốt."], "Từ 'hãy' biểu thị yêu cầu."],
  ["Từ nối phù hợp: 'Trời mưa ___ em vẫn đi học đúng giờ.'", "nhưng", ["vì", "nên", "hoặc"], "Nhưng nối hai ý tương phản."],
];

const science: Fact[] = [
  ["Hành tinh gần Mặt Trời nhất là?", "Sao Thủy", ["Sao Kim", "Trái Đất", "Sao Hỏa"], "Sao Thủy là hành tinh thứ nhất tính từ Mặt Trời."],
  ["Hành tinh lớn nhất Hệ Mặt Trời là?", "Sao Mộc", ["Sao Thổ", "Trái Đất", "Sao Hỏa"], "Sao Mộc là hành tinh lớn nhất."],
  ["Hành tinh nóng nhất là?", "Sao Kim", ["Sao Thủy", "Sao Hỏa", "Sao Hải Vương"], "Khí quyển dày làm Sao Kim nóng nhất."],
  ["Hệ Mặt Trời thuộc thiên hà nào?", "Ngân Hà", ["Andromeda", "Tam Giác", "Sombrero"], "Hệ Mặt Trời nằm trong thiên hà Ngân Hà."],
  ["Có bao nhiêu hành tinh trong Hệ Mặt Trời?", "8", ["7", "9", "10"], "Hệ Mặt Trời có tám hành tinh."],
  ["Ngôi sao ở trung tâm Hệ Mặt Trời là?", "Mặt Trời", ["Sao Kim", "Sao Bắc Cực", "Mặt Trăng"], "Mặt Trời là ngôi sao duy nhất trong Hệ Mặt Trời."],
  ["Bốn hành tinh trong cùng có bề mặt chủ yếu là?", "đất đá", ["khí", "băng", "nước"], "Sao Thủy, Sao Kim, Trái Đất và Sao Hỏa là hành tinh đất đá."],
  ["Trái Đất là hành tinh thứ mấy từ Mặt Trời?", "thứ ba", ["thứ hai", "thứ tư", "thứ năm"], "Trái Đất đứng thứ ba."],
  ["Hành tinh nổi bật với hệ vành đai là?", "Sao Thổ", ["Sao Hỏa", "Sao Thủy", "Trái Đất"], "Sao Thổ có hệ vành đai dễ quan sát nhất."],
  ["Sao Diêm Vương hiện được xếp là?", "hành tinh lùn", ["hành tinh khí", "vệ tinh", "ngôi sao"], "IAU xếp Sao Diêm Vương là hành tinh lùn."],
  ["Thực vật dùng khí nào cho quang hợp?", "carbon dioxide", ["helium", "neon", "hydrogen"], "Thực vật hấp thụ carbon dioxide khi quang hợp."],
  ["Cơ quan bơm máu trong cơ thể là?", "tim", ["phổi", "dạ dày", "thận"], "Tim co bóp để đưa máu đi khắp cơ thể."],
  ["Nước tinh khiết đóng băng gần nhiệt độ nào?", "0°C", ["10°C", "50°C", "100°C"], "Ở áp suất thường, nước đóng băng ở 0°C."],
  ["Lực kéo vật về phía Trái Đất gọi là?", "trọng lực", ["ma sát", "đàn hồi", "lực nâng"], "Trọng lực hút vật về phía tâm Trái Đất."],
  ["Đơn vị đo cường độ dòng điện là?", "ampe", ["vôn", "oát", "mét"], "Ampe (A) là đơn vị cường độ dòng điện."],
  ["Chất nào dẫn điện tốt?", "đồng", ["cao su", "nhựa", "gỗ khô"], "Đồng là kim loại dẫn điện tốt."],
  ["Âm thanh cần gì để truyền?", "môi trường vật chất", ["chân không tuyệt đối", "ánh sáng", "từ trường"], "Âm thanh là sóng cơ và cần môi trường truyền."],
  ["Quá trình chất lỏng biến thành khí gọi là?", "bay hơi", ["ngưng tụ", "đông đặc", "nóng chảy"], "Bay hơi là chuyển từ thể lỏng sang thể khí."],
  ["Bộ phận chính hấp thụ nước của cây là?", "rễ", ["hoa", "quả", "hạt"], "Rễ hút nước và muối khoáng từ đất."],
  ["Động vật có xương sống và lông vũ thuộc nhóm?", "chim", ["cá", "lưỡng cư", "bò sát"], "Lông vũ là đặc điểm nổi bật của chim."],
  ["Kim loại nào ở thể lỏng gần nhiệt độ phòng?", "thủy ngân", ["sắt", "nhôm", "đồng"], "Thủy ngân là kim loại lỏng trong điều kiện thường."],
  ["Dung dịch có pH nhỏ hơn 7 thường là?", "axit", ["bazơ", "trung tính", "kim loại"], "pH dưới 7 biểu thị tính axit."],
  ["Nguồn năng lượng tái tạo nào dùng ánh sáng?", "năng lượng mặt trời", ["than đá", "dầu mỏ", "khí tự nhiên"], "Pin mặt trời chuyển năng lượng ánh sáng thành điện."],
  ["Hô hấp ở người lấy khí nào vào cơ thể?", "oxygen", ["carbon dioxide", "methane", "helium"], "Cơ thể dùng oxygen trong hô hấp tế bào."],
  ["Vật liệu nào thường bị nam châm hút?", "sắt", ["gỗ", "thủy tinh", "giấy"], "Sắt là vật liệu có tính sắt từ."],
];

const society: Fact[] = [
  ["Thủ đô của Việt Nam là?", "Hà Nội", ["Huế", "Đà Nẵng", "Cần Thơ"], "Hà Nội là thủ đô Việt Nam."],
  ["Việt Nam nằm ở châu lục nào?", "Châu Á", ["Châu Âu", "Châu Phi", "Châu Mỹ"], "Việt Nam thuộc Đông Nam Á."],
  ["Đại dương lớn nhất thế giới là?", "Thái Bình Dương", ["Đại Tây Dương", "Ấn Độ Dương", "Bắc Băng Dương"], "Thái Bình Dương có diện tích lớn nhất."],
  ["Đường Xích đạo chia Trái Đất thành?", "Bắc bán cầu và Nam bán cầu", ["Đông và Tây Á", "đất liền và biển", "hai múi giờ"], "Xích đạo là vĩ tuyến 0°."],
  ["Châu lục có diện tích lớn nhất là?", "Châu Á", ["Châu Âu", "Châu Úc", "Châu Nam Cực"], "Châu Á là châu lục lớn nhất."],
  ["Sông dài chảy qua Ai Cập là?", "sông Nile", ["sông Amazon", "sông Danube", "sông Mekong"], "Sông Nile gắn liền với văn minh Ai Cập."],
  ["Dãy núi có đỉnh Everest là?", "Himalaya", ["Alps", "Andes", "Trường Sơn"], "Everest thuộc dãy Himalaya."],
  ["Quốc gia có hình chiếc ủng là?", "Ý", ["Pháp", "Đức", "Na Uy"], "Bán đảo Ý thường được ví như chiếc ủng."],
  ["Kinh tuyến gốc đi qua Greenwich có số độ là?", "0°", ["90°", "180°", "360°"], "Kinh tuyến Greenwich được quy ước là 0°."],
  ["Khí hậu gần Xích đạo thường?", "nóng quanh năm", ["lạnh quanh năm", "khô tuyệt đối", "có băng vĩnh cửu"], "Góc chiếu Mặt Trời lớn làm vùng xích đạo nóng."],
  ["Ngày Quốc khánh Việt Nam là?", "2/9", ["30/4", "1/5", "20/11"], "Ngày 2/9/1945 Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập."],
  ["Chiến thắng Điện Biên Phủ diễn ra năm?", "1954", ["1945", "1968", "1975"], "Chiến dịch Điện Biên Phủ kết thúc năm 1954."],
  ["Nhà nước đầu tiên trong lịch sử Việt Nam là?", "Văn Lang", ["Đại Cồ Việt", "Đại Việt", "Âu Lạc"], "Văn Lang gắn với thời các vua Hùng."],
  ["Người lãnh đạo khởi nghĩa Lam Sơn là?", "Lê Lợi", ["Trần Hưng Đạo", "Quang Trung", "Ngô Quyền"], "Lê Lợi lãnh đạo khởi nghĩa Lam Sơn."],
  ["Chiến thắng Bạch Đằng năm 938 gắn với?", "Ngô Quyền", ["Lý Thường Kiệt", "Lê Hoàn", "Trần Quốc Tuấn"], "Ngô Quyền đánh bại quân Nam Hán trên sông Bạch Đằng."],
  ["Vua Quang Trung đại phá quân Thanh vào dịp?", "Tết Kỷ Dậu 1789", ["Tết Mậu Thân 1968", "mùa thu 1945", "xuân 1954"], "Chiến thắng Ngọc Hồi - Đống Đa diễn ra đầu năm 1789."],
  ["Kinh đô nhà Nguyễn đặt tại?", "Huế", ["Thăng Long", "Hoa Lư", "Cổ Loa"], "Huế là kinh đô triều Nguyễn."],
  ["Văn Miếu - Quốc Tử Giám nằm ở?", "Hà Nội", ["Hải Phòng", "Đà Lạt", "Nha Trang"], "Di tích nằm tại Hà Nội."],
  ["Hiệp định Genève về Đông Dương được ký năm?", "1954", ["1946", "1963", "1973"], "Hiệp định Genève được ký năm 1954."],
  ["Đại thắng mùa Xuân kết thúc vào ngày?", "30/4/1975", ["2/9/1945", "7/5/1954", "19/8/1945"], "Ngày 30/4/1975 đánh dấu kết thúc chiến tranh, thống nhất đất nước."],
  ["Cơ quan lập pháp cao nhất ở Việt Nam là?", "Quốc hội", ["Chính phủ", "Tòa án", "Ủy ban xã"], "Quốc hội thực hiện quyền lập hiến và lập pháp."],
  ["Khi thấy đèn đỏ giao thông, người đi đường phải?", "dừng lại", ["tăng tốc", "rẽ bất kỳ", "bấm còi liên tục"], "Đèn đỏ báo hiệu phải dừng."],
  ["Hành động nào thể hiện tôn trọng sự khác biệt?", "lắng nghe ý kiến khác", ["chế giễu", "cô lập", "áp đặt"], "Lắng nghe giúp đối thoại văn minh."],
  ["Việc làm nào bảo vệ môi trường?", "phân loại rác", ["đốt nhựa", "xả rác xuống sông", "lãng phí nước"], "Phân loại hỗ trợ tái chế và xử lý rác."],
  ["Khi có mâu thuẫn, cách phù hợp là?", "bình tĩnh trao đổi", ["dùng bạo lực", "đăng xúc phạm", "lôi kéo đám đông"], "Trao đổi bình tĩnh giúp tìm giải pháp an toàn."],
];

const digital: Fact[] = [
  ["Mật khẩu nào mạnh hơn?", "MuaHe!2026_RatDai", ["123456", "password", "ngaysinh"], "Mật khẩu dài và khó đoán an toàn hơn."],
  ["MFA giúp bảo vệ tài khoản bằng cách nào?", "thêm bước xác minh", ["xóa mật khẩu", "công khai mã", "tắt cập nhật"], "MFA yêu cầu yếu tố bổ sung ngoài mật khẩu."],
  ["Email lạ yêu cầu bấm link gấp có thể là?", "lừa đảo phishing", ["bản cập nhật chắc chắn", "thư hệ thống luôn đúng", "quảng cáo an toàn"], "Thông điệp tạo áp lực và link lạ là dấu hiệu phishing."],
  ["Khi phần mềm báo cập nhật bảo mật, nên?", "cập nhật sớm từ nguồn chính thức", ["bỏ qua mãi", "tải bản lạ", "tắt diệt virus"], "Cập nhật vá các lỗ hổng đã biết."],
  ["Nên dùng một mật khẩu cho mọi tài khoản không?", "Không", ["Có", "Chỉ tài khoản tiền", "Chỉ mạng xã hội"], "Mật khẩu riêng hạn chế thiệt hại khi một nơi bị lộ."],
  ["Trước khi nhập mật khẩu vào web, cần kiểm tra?", "địa chỉ trang và HTTPS", ["màu nền", "số quảng cáo", "ảnh đại diện"], "Tên miền đúng và kết nối HTTPS giúp tránh trang giả."],
  ["Mã OTP nên chia sẻ cho ai?", "không ai", ["người gọi tự xưng ngân hàng", "bạn trên mạng", "người bán hàng"], "OTP là bí mật xác thực tạm thời."],
  ["Trình quản lý mật khẩu dùng để?", "lưu và tạo mật khẩu mạnh", ["đăng công khai mật khẩu", "tắt MFA", "xóa cập nhật"], "Công cụ này giúp dùng mật khẩu riêng và dài."],
  ["File đính kèm lạ từ người không quen nên?", "không mở và báo cáo", ["mở ngay", "chuyển cho bạn", "tắt cảnh báo"], "File lạ có thể chứa mã độc."],
  ["Sao lưu dữ liệu giúp gì?", "khôi phục khi mất hoặc bị mã hóa", ["tăng quảng cáo", "lộ mật khẩu", "tắt bảo mật"], "Bản sao lưu cho phép phục hồi dữ liệu."],
  ["Thông tin nào không nên đăng công khai?", "địa chỉ nhà và lịch vắng nhà", ["món ăn yêu thích", "màu yêu thích", "sở thích đọc"], "Thông tin vị trí và lịch trình có thể gây rủi ro."],
  ["Wi-Fi công cộng phù hợp nhất để?", "đọc tin không nhạy cảm", ["chuyển tiền không bảo vệ", "gửi mật khẩu", "tắt HTTPS"], "Hạn chế giao dịch nhạy cảm trên mạng không tin cậy."],
  ["Thiết bị thất lạc nên được bảo vệ bằng?", "khóa màn hình", ["mật khẩu dán ngoài máy", "tắt định vị", "tự động đăng nhập mọi nơi"], "Khóa màn hình cản truy cập trái phép."],
  ["Ứng dụng chỉ nên cấp quyền khi?", "quyền cần cho chức năng", ["xin bất kỳ quyền nào", "quảng cáo yêu cầu", "không rõ lý do"], "Nguyên tắc tối thiểu giảm dữ liệu bị truy cập."],
  ["Bị bắt nạt trên mạng, nên?", "lưu bằng chứng và báo người tin cậy", ["trả đũa", "công khai mật khẩu", "im lặng chịu đựng"], "Báo cáo và tìm hỗ trợ là cách an toàn."],
  ["QR code ở nơi lạ nên được xử lý thế nào?", "kiểm tra nguồn và link trước khi mở", ["quét rồi nhập mật khẩu ngay", "tin tuyệt đối", "gửi OTP"], "QR có thể dẫn đến trang giả mạo."],
  ["Dấu hiệu tài khoản bị chiếm là?", "có đăng nhập hoặc tin nhắn không phải của mình", ["pin đầy", "màn hình sáng", "wifi mạnh"], "Hoạt động lạ cần đổi mật khẩu và đăng xuất phiên khác."],
  ["Sau khi nghi lộ mật khẩu, việc đầu tiên là?", "đổi mật khẩu và bật MFA", ["đăng mật khẩu lên mạng", "chờ vài tháng", "tắt cảnh báo"], "Đổi thông tin xác thực giúp chặn truy cập tiếp."],
  ["Tải phần mềm an toàn nhất từ?", "trang hoặc kho ứng dụng chính thức", ["link bình luận lạ", "file crack", "email không rõ nguồn"], "Nguồn chính thức giảm nguy cơ phần mềm độc hại."],
  ["Khi web yêu cầu thông tin quá mức cần?", "dừng lại và kiểm tra mục đích", ["nhập hết", "gửi ảnh giấy tờ ngay", "bỏ qua chính sách"], "Chỉ chia sẻ dữ liệu thực sự cần thiết."],
  ["Cập nhật tự động có lợi vì?", "nhận bản vá sớm", ["làm mật khẩu ngắn", "tắt mã hóa", "chia sẻ dữ liệu"], "Bản vá sửa lỗi bảo mật đã phát hiện."],
  ["Phishing thường tạo cảm giác nào?", "khẩn cấp hoặc đe dọa", ["bình tĩnh kiểm chứng", "không cần hành động", "hoàn toàn minh bạch"], "Kẻ gian gây áp lực để nạn nhân hành động vội."],
  ["Khi bạn bè gửi link bất thường, nên?", "xác minh qua kênh khác", ["bấm ngay", "nhập OTP", "chuyển tiếp hàng loạt"], "Tài khoản của bạn bè có thể đã bị chiếm."],
  ["Dữ liệu nhạy cảm gửi qua chat nên?", "hạn chế và dùng kênh phù hợp", ["gửi công khai", "để mãi trong nhóm", "gửi cho người lạ"], "Giảm chia sẻ giúp giảm nguy cơ lộ lọt."],
  ["Cách an toàn khi rời máy tính là?", "khóa màn hình", ["để mở tài khoản", "ghi mật khẩu trên bàn", "tắt cập nhật"], "Khóa máy ngăn người khác dùng phiên đăng nhập."],
];

export const sampleCatalogue: Quiz[] = [
  ...mathQuizzes("Cộng trừ"),
  ...mathQuizzes("Nhân chia"),
  ...mathQuizzes("Phân số"),
  ...mathQuizzes("Hình học"),
  ...mathQuizzes("Tỉ lệ phần trăm"),
  ...mathQuizzes("Đại số"),
  ...fiveQuizzes("Tiếng Anh · Từ vựng A1–A2", "Tiếng Anh", vocabulary, source.cefr),
  ...fiveQuizzes("Tiếng Anh · Ngữ pháp A1–A2", "Tiếng Anh", grammar, source.cefr),
  ...fiveQuizzes("Tiếng Việt · Từ và câu", "Tiếng Việt", vietnamese),
  ...fiveQuizzes("Khoa học · Tự nhiên và vũ trụ", "Khoa học", science, source.nasa),
  ...fiveQuizzes("Lịch sử, địa lý và công dân", "Xã hội", society),
  ...fiveQuizzes("Kỹ năng số · An toàn mạng", "Kỹ năng số", digital, source.cisa),
];
