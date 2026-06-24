interface ColumnDef {
  id: string;
  label: string;
}

interface TaskDef {
  title: string;
  description: string;
  status: string;
}

interface PromptPayload {
  columns: ColumnDef[];
  startDate: string;
  endDate: string;
  taskScope: string;
  expectedOutcome: string;
  existingTasks?: TaskDef[];
}

export interface SingleTaskPayload {
  title: string;
  description: string;
  startDate: string;
  dueDate: string;
}

/**
 * Builds the prompt for the AI to decompose the user's project/task scope into kanban tasks.
 */
export function buildDecompositionPrompt(payload: PromptPayload): string {
  const columnsJson = JSON.stringify(payload.columns, null, 2);
  const existingTasksStr = payload.existingTasks && payload.existingTasks.length > 0
    ? JSON.stringify(payload.existingTasks.map(t => ({ title: t.title, description: t.description, status: t.status })), null, 2)
    : "Hiç yok.";

  return `Sen deneyimli bir proje yöneticisi ve çevik (agile) süreç planlama uzmanısın. Kullanıcının verdiği proje/görev tanımını alacaksın ve bunu somut, uygulanabilir, bağımsız alt görevlere böleceksin.

Mevcut kanban sütunları (status alanı için bu ID'lerden birini seçmelisin):
${columnsJson}

Projedeki Mevcut Görevler (Backlog ve Diğer Kolonlar):
${existingTasksStr}

Kullanıcı Girdisi:
- Başlangıç Tarihi: ${payload.startDate}
- Bitiş Tarihi: ${payload.endDate}
- Görev Kapsamı: ${payload.taskScope}
- Beklenen Sonuç: ${payload.expectedOutcome}

Kurallar ve Yönergeler:
1. Oluşturulan tüm görevlerin "startDate" ve "dueDate" tarihleri mutlaka kullanıcının belirttiği başlangıç (${payload.startDate}) ve bitiş (${payload.endDate}) tarihleri arasında olmalıdır.
2. Her görevin "estimatedDays" (tahmini gün) değeri gerçekçi olmalı ve startDate/dueDate aralığıyla uyumlu olmalıdır.
3. Her görevin "status" alanı, yukarıda listelenen mevcut kanban sütunlarının "id" değerlerinden biri olmalıdır. Başlangıç görevleri için genellikle backlog veya ilk süreç sütununu seç.
4. "priority" alanı sadece 'low', 'medium', 'high' veya 'urgent' değerlerini alabilir.
5. Görevlerin "tags" listesi ilgili etiketleri içermelidir (örneğin: 'frontend', 'backend', 'design', 'testing').
6. Projedeki mevcut görevleri ve yeni ekleyeceğiniz planlama kapsamını analiz ederek, bir "logicAnalysis" (Mantık Analizi) hazırlayın:
   - Yeni görevlerin mevcut görevlerle olan ilişkileri, çakışmaları veya bağımlılıkları.
   - İş akışını hızlandıracak kritik yollar (örneğin: "X ve Y görevleri bağıntılı ancak önce Z göreviyle başlanırsa bu iki görev daha hızlı bitirilir" gibi pratik öneriler).
   - Mantıksal tavsiyeler (bu olur/bu olmaz, şu sırayla yapılmalı).
7. Çıktı SADECE geçerli bir JSON objesi olmalıdır. Kesinlikle markdown kod blokları (\`\`\`) dışında veya içinde başka hiçbir açıklama, giriş veya sonuç metni ekleme.

Çıktı Şeması:
{
  "tasks": [
    {
      "title": "Görev Başlığı (kısa ve net)",
      "description": "Görevin detaylı açıklaması ve yapılacaklar listesi",
      "priority": "low" | "medium" | "high" | "urgent",
      "estimatedDays": 2,
      "startDate": "YYYY-MM-DD",
      "dueDate": "YYYY-MM-DD",
      "tags": ["tag1", "tag2"],
      "status": "sutun-id"
    }
  ],
  "summary": "Projenin genel özeti ve planlama yaklaşımı",
  "logicAnalysis": "Mevcut görevlerin ve yeni görevlerin mantıksal analizi, bağımlılık optimizasyonu ve kritik iş sırası önerileri."
}

Lütfen bu kurallara harfiyen uyarak SADECE yukarıdaki şemaya uygun JSON üret.`;
}

/**
 * Builds the prompt for breaking a single task down into smaller micro-tasks.
 */
export function buildSingleTaskDecompositionPrompt(payload: SingleTaskPayload): string {
  return `Sen deneyimli bir proje yöneticisisin. Sana verilen aşağıdaki büyük görevi (epic/task), daha küçük, 3-5 story point (veya 1-2 gün sürecek) mikro görevlere (alt görevlere) bölmen gerekiyor:

Büyük Görev:
- Başlık: ${payload.title}
- Açıklama: ${payload.description}
- Başlangıç Tarihi: ${payload.startDate}
- Bitiş Tarihi: ${payload.dueDate}

Kurallar:
1. Büyük görevi 3 ila 5 adet daha küçük, somut ve bağımsız mikro göreve böl.
2. Mikro görevlerin "startDate" ve "dueDate" tarihleri mutlaka ana görevin tarih aralığı (${payload.startDate} ile ${payload.dueDate}) içinde olmalıdır.
3. Her mikro görevin "priority", "status", "estimatedDays" ve "tags" alanları olmalıdır. Ana görevin status ve tags değerlerini devralabilir veya güncelleyebilirler.
4. Çıktı SADECE geçerli bir JSON objesi olmalıdır. Kesinlikle markdown kod blokları (\`\`\`) dışında veya içinde başka hiçbir açıklama ekleme.

Çıktı Şeması:
{
  "tasks": [
    {
      "title": "Mikro Görev Başlığı",
      "description": "Detaylı açıklama",
      "priority": "low" | "medium" | "high" | "urgent",
      "estimatedDays": 1,
      "startDate": "YYYY-MM-DD",
      "dueDate": "YYYY-MM-DD",
      "tags": ["tag1"],
      "status": "sutun-id"
    }
  ]
}`;
}

export interface ProjectSummaryPayload {
  projectName: string;
  columns: { id: string; label: string }[];
  tasks: {
    title: string;
    description: string;
    status: string;
    priority: string;
    tags: string[];
  }[];
}

export function buildProjectSummaryPrompt(payload: ProjectSummaryPayload): string {
  const tasksJson = JSON.stringify(payload.tasks.map(t => ({
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    tags: t.tags
  })), null, 2);

  return `Sen son derece deneyimli bir Çevik Süreç (Agile/Scrum) ve Yazılım Proje Yöneticisi AI Asistanısın.
Aşağıda verilen projedeki mevcut görevlerin (task) kalitesini, bağlam uyumunu (context alignment), detay seviyelerini ve iş akışı verimliliğini analiz etmen gerekiyor.

Proje Adı: ${payload.projectName}
Mevcut Görevler:
${tasksJson}

Lütfen projedeki bu görevleri analiz ederek aşağıdaki yapıda SADECE geçerli bir JSON çıktısı üret:

1. "contextScore": 0 ile 100 arasında bir puan. Görevlerin ne kadar net tanımlandığını, açıklamaların yeterliliğini ve projenin genel olarak ne kadar olgun bir bağlamda olduğunu temsil etsin.
2. "generalSummary": Projenin genel durumunun, görevlerin netliğinin ve olgunluğunun 3-4 cümlelik bir özeti.
3. "recommendations": Görev kalitesini artırmak için öneriler listesi. Örneğin: "X görevinin açıklaması çok yetersiz, başarı kriterleri (Definition of Done) eklenmeli", "Y ve Z görevleri çok büyük, bölünmeli" veya "Tarih atamaları çakışıyor" gibi. Her önerinin bir "title" (başlık) ve "desc" (detay) alanı olmalıdır.
4. "workflowOptimization": İş akışını hızlandıracak veya verimliliği artıracak süreç önerileri. Hangi görevlerin birbiriyle bağımlı olduğu, hangisinden başlanırsa projenin daha hızlı ilerleyeceği veya tıkanıklık (bottleneck) olabilecek durumlar.

Kurallar:
- Çıktı SADECE geçerli bir JSON objesi olmalıdır. Kesinlikle markdown kod blokları (\`\`\`) dışında veya içinde başka hiçbir açıklama ekleme.

Çıktı Şeması:
{
  "contextScore": 75,
  "generalSummary": "Genel özet...",
  "recommendations": [
    { "title": "Başlık", "desc": "Detaylı açıklama..." }
  ],
  "workflowOptimization": "İş akışı önerisi..."
}`;
}

