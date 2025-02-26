// Define reusable interfaces for SERP result items
export interface SerpResultItem {
  link: string;
  title?: string;
  snippet?: string;
  rich_snippet?: {
    top?: {
      detected_extensions?: {
        price?: string;
        currency?: {
          code?: string;
          symbol?: string;
        };
      };
      extensions?: string[];
    };
  };
}

export interface LocalResultItem {
  website?: string;
  title?: string;
  rating?: number;
  reviews?: number;
  snippet?: string;
}

export interface ValueserpResponse {
  organic_results?: Array<SerpResultItem>;
  shopping_results?: Array<SerpResultItem>;
  local_results?: Array<LocalResultItem>;

  search_parameters?: {
    q: string;
    [key: string]: unknown;
  };

  search_information?: {
    total_results: number;
    [key: string]: unknown;
  };

  knowledge_graph?: {
    title: string;
    website?: string;
    [key: string]: unknown;
  };

  related_questions?: Array<{
    question: string;
    source?: {
      link?: string;
      title?: string;
    };
    answer?: string;
    [key: string]: unknown;
  }>;

  [key: string]: unknown;
}
