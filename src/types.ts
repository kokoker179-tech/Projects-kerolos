export interface Project {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  githubLink?: string;
  liveLink?: string;
  tags?: string[];
  createdAt: number;
}
