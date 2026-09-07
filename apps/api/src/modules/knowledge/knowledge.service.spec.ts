import { KnowledgeService } from './knowledge.service';

describe('KnowledgeService', () => {
  let service: KnowledgeService;
  let mockDocRepo: any;
  let mockChunkRepo: any;
  let mockLLM: any;
  let mockDataSource: any;

  beforeEach(() => {
    mockDocRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((doc) => Promise.resolve({ ...doc, id: 'doc-1' })),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    mockChunkRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto })),
      save: jest.fn().mockImplementation((chunk) => Promise.resolve({ ...chunk, id: 'chunk-1' })),
      createQueryBuilder: jest.fn(),
    };
    mockLLM = { embed: jest.fn() };
    mockDataSource = { query: jest.fn().mockResolvedValue([]) };
    service = new KnowledgeService(mockDocRepo, mockChunkRepo, mockLLM, mockDataSource);
    jest.clearAllMocks();
  });

  describe('splitIntoChunks', () => {
    it('splits text with overlap', () => {
      const text = 'abc'.repeat(100);
      const chunks = (service as any).splitIntoChunks(text, 100, 20);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.every((c: string) => c.length <= 100)).toBe(true);
      if (chunks.length > 1) {
        expect(chunks[1].startsWith(chunks[0].slice(80, 100))).toBe(true);
      }
    });

    it('returns the original text as a single chunk when shorter than size', () => {
      const text = 'short text';
      const chunks = (service as any).splitIntoChunks(text, 100, 20);
      expect(chunks).toEqual([text]);
    });
  });

  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      expect((service as any).cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    });

    it('returns 0 for orthogonal vectors', () => {
      expect((service as any).cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    });

    it('returns 0 for vectors of different length', () => {
      expect((service as any).cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
    });

    it('returns 0 for empty vectors', () => {
      expect((service as any).cosineSimilarity([], [])).toBe(0);
    });
  });

  describe('searchRelevant', () => {
    it('returns top chunks above the similarity threshold', async () => {
      mockLLM.embed.mockResolvedValue([1, 0]);

      const fixedDate = new Date('2024-01-15T10:00:00Z');
      const chain = {
        innerJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { chunk_content: 'first relevant chunk', chunk_embedding: JSON.stringify([1, 0]), doc_sourceUrl: 'http://a', doc_createdAt: fixedDate },
          { chunk_content: 'orthogonal chunk', chunk_embedding: JSON.stringify([0, 1]), doc_sourceUrl: null, doc_createdAt: fixedDate },
          { chunk_content: 'somewhat relevant chunk', chunk_embedding: JSON.stringify([0.707, 0.707]), doc_sourceUrl: null, doc_createdAt: fixedDate },
        ]),
      };
      mockChunkRepo.createQueryBuilder.mockReturnValue(chain);

      const results = await service.searchRelevant('t-1', 'query', 'agent-1');

      expect(mockLLM.embed).toHaveBeenCalledWith('query', { task: 'retrieval.query' });
      expect(mockChunkRepo.createQueryBuilder).toHaveBeenCalledWith('chunk');
      expect(results.length).toBe(2);
      expect(results.some((r) => r.includes('first relevant chunk'))).toBe(true);
      expect(results.some((r) => r.includes('somewhat relevant chunk'))).toBe(true);
      expect(results.every((r) => r.includes('orthogonal chunk'))).toBe(false);
    });

    it('returns empty array when no chunks are found', async () => {
      mockLLM.embed.mockResolvedValue([1, 0]);
      const chain = {
        innerJoin: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };
      mockChunkRepo.createQueryBuilder.mockReturnValue(chain);

      const results = await service.searchRelevant('t-1', 'query', 'agent-1');
      expect(results).toEqual([]);
    });
  });

  describe('addText', () => {
    it('creates a document and chunks it with embeddings', async () => {
      mockLLM.embed.mockResolvedValue([1, 0, 1]);

      await service.addText('t-1', 'hello world', 'test.txt', 'agent-1', true);

      expect(mockDocRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 't-1',
          type: 'text',
          content: 'hello world',
          filename: 'test.txt',
          agentId: 'agent-1',
          shared: true,
        }),
      );
      expect(mockDocRepo.save).toHaveBeenCalled();
      expect(mockLLM.embed).toHaveBeenCalledWith('hello world', { task: 'retrieval.passage' });
      expect(mockChunkRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 'doc-1',
          content: 'hello world',
          chunkIndex: 0,
          embedding: JSON.stringify([1, 0, 1]),
        }),
      );
      expect(mockChunkRepo.save).toHaveBeenCalled();
    });
  });
});
