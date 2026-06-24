interface ColumnDef {
  id: string;
  label: string;
}

interface PromptPayload {
  columns: ColumnDef[];
  startDate: string;
  endDate: string;
  taskScope: string;
  expectedOutcome: string;
}

/**
 * Builds the prompt for the AI to decompose the user's project/task scope into kanban tasks.
 */
export function buildDecompositionPrompt(payload: PromptPayload): string {
  const columnsJson = JSON.stringify(payload.columns, null, 2);

  return `Sen deneyimli bir proje yöneticisi ve çevik (agile) süreç planlama uzmanısın. Kullanıcının verdiği proje/görev tanımını alacaksın ve bunu somut, uygulanabilir, bağımsız alt görevlere böleceksin.

Mevcut kanban sütunları (status alanı için bu ID'lerden birini seçmelisin):
${columnsJson}

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
6. Çıktı SADECE geçerli bir JSON objesi olmalıdır. Kesinlikle markdown kod blokları (\`\`\`) dışında veya içinde başka hiçbir açıklama, giriş veya sonuç metni ekleme.

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
  "summary": "Projenin genel özeti ve planlama yaklaşımı"
}

Lütfen bu kurallara harfiyen uyarak SADECE yukarıdaki şemaya uygun JSON üret.`;
}
