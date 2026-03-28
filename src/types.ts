export interface Project {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  githubLink?: string;
  liveLink?: string;
  duration?: string;
  tags?: string[];
  createdAt: number;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: number;
}
