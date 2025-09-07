from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document as LangChainDocument

# Use sentence-transformers directly instead of langchain_community embeddings
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False

# Use chromadb directly instead of langchain_community vectorstores
try:
    import chromadb
    from chromadb.config import Settings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False

import os
from groq import Groq
import requests
from dotenv import load_dotenv

import json
import re
import random

import fitz

# Load environment variables from .env file
load_dotenv()

class ChromaRetriever:
    """ChromaDB retriever with sentence transformers for semantic search."""
    
    def __init__(self, collection, embedding_model):
        self.collection = collection
        self.embedding_model = embedding_model
    
    def get_relevant_documents(self, query, k=3):
        """Return documents that are semantically similar to the query."""
        # Encode the query using sentence transformers
        query_embedding = self.embedding_model.encode([query]).tolist()
        
        # Query ChromaDB for similar documents
        results = self.collection.query(
            query_embeddings=query_embedding,
            n_results=k
        )
        
        # Convert results back to LangChain document format
        documents = []
        if results['documents'] and len(results['documents']) > 0:
            for doc_text in results['documents'][0]:
                documents.append(LangChainDocument(page_content=doc_text))
        
        return documents

def get_interview_topics(company: str, role: str, extra_topics: str = ""):
    """
    Ask Perplexity Sonar for important interview topics for a given company & role.
    Focus on DSA concepts, project-based topics, and behavioral aspects.

    Args:
        company (str): Company name (e.g., 'Microsoft').
        role (str): Role name (e.g., 'SDE Intern').
        extra_topics (str): Optional, HR-specified focus topics (e.g., 'Java, SQL').

    Returns:
        list: Extracted list of topics suggested by Sonar.
    """
    api_key = os.getenv("PERPLEXITY_API_KEY")
    if not api_key:
        raise ValueError("PERPLEXITY_API_KEY not found in environment variables")
    
    url = "https://api.perplexity.ai/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    query = f"""List the most important interview topics for {company} {role} position covering:
               1. Data Structures and Algorithms (theoretical concepts)
               2. System Design and Architecture concepts
               3. Programming languages and frameworks commonly used
               4. Project development methodologies and best practices
               5. Problem-solving and behavioral competencies
               
               Additional focus areas: {extra_topics}
               
               Return a comprehensive list of specific topics under each category, formatted as a clean list."""

    payload = {
        "model": "sonar",
        "messages": [
            {"role": "system", "content": "You are an expert technical recruiter with deep knowledge of software engineering interviews. Focus on providing comprehensive topics that cover DSA theory, practical project skills, and behavioral assessment."},
            {"role": "user", "content": query}
        ],
        "max_tokens": 500
    }

    response = requests.post(url, headers=headers, json=payload)
    data = response.json()

    try:
        content = data["choices"][0]["message"]["content"]
        topics = [t.strip("-• ") for t in content.split("\n") if t.strip()]
        return topics
    except Exception as e:
        print("Error parsing response:", e)
        return data

def merge_hr_with_hot_topics(hr_prompt: str = None, hot_topics: list[str] = None) -> dict:
    """
    Merge recruiter input (broad topics) with most-asked/hot topics for the role
    using Groq DeepSeek reasoning model. Categorize topics for structured interview.
    """
    # Initialize Groq client
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    if hot_topics is None:
        hot_topics = ["Data Structures Concepts", "Algorithm Trade-offs", "Time Complexity Analysis", "Performance Optimization", 
                     "Web Development Frameworks", "Database Technologies", "API Design", "Cloud Platforms",
                     "Testing Strategies", "DevOps Practices", "Version Control", "Code Review Process",
                     "Problem Solving Approach", "Team Collaboration", "Communication Skills", "Learning Agility"]

    # Generate recruiter instruction if not provided
    if hr_prompt is None:
        gen_response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are an HR assistant. Generate comprehensive recruiter instructions for SDE candidate evaluation covering technical and behavioral aspects."},
                {"role": "user", "content": "Create detailed recruiter-style interview instructions for evaluating SDE candidates on DSA theory, project experience, and behavioral competencies."}
            ],
            temperature=0.3,
            max_tokens=200
        )
        hr_prompt = gen_response.choices[0].message.content.strip()

    # Strict JSON prompt
    user_message = f"""
Recruiter instruction: {hr_prompt}
Most asked (hot) topics: {", ".join(hot_topics)}

Your task:
1. Identify recruiter’s main evaluation categories.
2. Map the given hot topics under the most relevant categories.
3. Return ONLY valid JSON. No reasoning, no natural language, no markdown.
4. The JSON must follow this structure exactly:

{{
  "Category1": ["topic1", "topic2"],
  "Category2": ["topic3"],
  ...
}}
"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": "You are a JSON generator for interview categorization. Always output ONLY valid JSON with DSA_Theory, Project_Based, and Behavioral categories. Never include explanations."},
            {"role": "user", "content": user_message}
        ],
        temperature=0,
        max_tokens=800
    )

    reply = response.choices[0].message.content.strip()

    # --- Extract clean JSON ---
    try:
        return json.loads(reply)
    except:
        match = re.search(r"\{.*\}", reply, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except:
                return {"raw_output": reply}
        return {"raw_output": reply}

# PyMuPDF for PDF parsing

def parse_resume(file_obj) -> str:
    # file_obj: Django InMemoryUploadedFile or similar
    doc = fitz.open(stream=file_obj.read(), filetype="pdf")
    text = ""
    for page in doc:
        text += page.get_text("text")
    return text

    
def query_resume(retriever, query, top_k=3):
    """Query the resume using ChromaDB semantic search."""
    docs = retriever.get_relevant_documents(query, k=top_k)
    return [doc.page_content for doc in docs]


def build_retriever(text: str, persist_directory: str = "chroma_db_00"):
    """
    Chunks text, creates embeddings using sentence transformers, and builds a ChromaDB retriever.
    """
    if not CHROMADB_AVAILABLE:
        raise ImportError("chromadb is required but not available. Please install with: pip install chromadb")
    
    if not SENTENCE_TRANSFORMERS_AVAILABLE:
        raise ImportError("sentence-transformers is required but not available. Please install with: pip install sentence-transformers")
    
    # Initialize the sentence transformer model
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    
    # Split into chunks
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks = text_splitter.split_text(text)
    
    # Initialize ChromaDB client
    chroma_client = chromadb.Client(Settings(
        persist_directory=persist_directory,
        anonymized_telemetry=False
    ))
    
    # Create or get collection
    collection_name = "resume_collection"
    try:
        # Try to get existing collection
        collection = chroma_client.get_collection(name=collection_name)
        # Delete existing collection to avoid duplicates
        chroma_client.delete_collection(name=collection_name)
    except:
        pass  # Collection doesn't exist, which is fine
    
    # Create new collection
    collection = chroma_client.create_collection(
        name=collection_name,
        metadata={"description": "Resume text chunks for interview question generation"}
    )
    
    # Generate embeddings and add to collection
    if chunks:
        # Generate embeddings for all chunks
        embeddings = embedding_model.encode(chunks).tolist()
        
        # Create unique IDs for each chunk
        ids = [f"chunk_{i}" for i in range(len(chunks))]
        
        # Add documents to collection
        collection.add(
            documents=chunks,
            embeddings=embeddings,
            ids=ids
        )
    
    # Return ChromaDB retriever
    return ChromaRetriever(collection, embedding_model)



def generate_questions(final_topics, retriever, num_questions=5):
    """
    Generate structured interview questions: 1 DSA theoretical, 3 project-based, 1 behavioral.
    
    Args:
        final_topics: Dictionary with categorized topics (DSA_Theory, Project_Based, Behavioral)
        retriever: ChromaDB retriever for resume context
        num_questions: Total number of questions (default 5)
    
    Returns:
        dict: Generated questions organized by category and type
    """
    generated_questions = {
        "DSA_Theory": [],
        "Project_Based": [],
        "Behavioral": []
    }
    
    # Generate 1 DSA theoretical question
    if "DSA_Theory" in final_topics and final_topics["DSA_Theory"]:
        dsa_topic = random.choice(final_topics["DSA_Theory"])
        question = generate_question(dsa_topic, retriever, question_type="DSA_Theory")
        generated_questions["DSA_Theory"].append({
            "topic": dsa_topic,
            "question": question,
            "type": "DSA Theoretical"
        })
    
    # Generate 3 project-based questions
    if "Project_Based" in final_topics and final_topics["Project_Based"]:
        project_topics = final_topics["Project_Based"]
        selected_project_topics = random.sample(project_topics, min(3, len(project_topics)))
        
        for topic in selected_project_topics:
            question = generate_question(topic, retriever, question_type="Project_Based")
            generated_questions["Project_Based"].append({
                "topic": topic,
                "question": question,
                "type": "Project-Based"
            })
    
    # Generate 1 behavioral question
    if "Behavioral" in final_topics and final_topics["Behavioral"]:
        behavioral_topic = random.choice(final_topics["Behavioral"])
        question = generate_question(behavioral_topic, retriever, question_type="Behavioral")
        generated_questions["Behavioral"].append({
            "topic": behavioral_topic,
            "question": question,
            "type": "Behavioral"
        })
    
    return generated_questions

def generate_question(topic: str, retriever, question_type: str = "general") -> str:
    """
    Generates an interview question based on a topic, resume context, and question type.

    Args:
        topic (str): The technical topic for the question.
        retriever: The ChromaDB retriever object to get resume context using semantic search.
        question_type (str): Type of question - "DSA_Theory", "Project_Based", or "Behavioral"

    Returns:
        str: The generated interview question.
    """
    # Initialize Groq client
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    # Retrieve relevant context from the resume based on the topic
    resume_context_docs = retriever.get_relevant_documents(topic)
    resume_context = "\n".join([doc.page_content for doc in resume_context_docs])

    # Build different prompts based on question type
    if question_type == "DSA_Theory":
        prompt = f"""
You are an AI interviewer conducting a technical interview. Generate a DATA STRUCTURES AND ALGORITHMS discussion question.

Topic: {topic}
Resume Context: {resume_context}

Requirements:
- Create a VERBAL discussion question about DSA concepts (NO algorithm design/coding required)
- Focus on explaining concepts, trade-offs, when to use which data structure/algorithm
- Ask about time/space complexity analysis of existing algorithms
- Questions should be answerable through explanation and discussion only
- Examples: "Explain when you would use X vs Y", "What are the trade-offs of...", "How would you optimize..."
- Make it relevant to real development scenarios they might have encountered
- NO paper/whiteboard design questions

Generate only the question, no answers or explanations.
"""
        
    elif question_type == "Project_Based":
        prompt = f"""
You are an AI interviewer conducting a technical interview. Generate a TECH STACK and DEVELOPMENT focused question.

Topic: {topic}
Resume Context: {resume_context}

Requirements:
- Create a question about technology choices, development practices, or tech stack decisions
- Focus on real-world development scenarios and technology implementation
- Ask about frameworks, libraries, tools, deployment, testing, or architecture decisions
- Questions should be answerable through verbal explanation of experience/knowledge
- Examples: "How would you handle...", "What technologies would you choose for...", "Explain your experience with..."
- Reference their project experience and tech stack from resume when possible
- NO system design diagrams or complex architecture drawing required
- Focus on practical development knowledge and tech stack expertise

Generate only the question, no answers or explanations.
"""
        
    elif question_type == "Behavioral":
        prompt = f"""
You are an AI interviewer conducting a behavioral interview. Generate a BEHAVIORAL question.

Topic: {topic}
Resume Context: {resume_context}

Requirements:
- Create a behavioral question that assesses soft skills and workplace scenarios
- Focus on leadership, communication, teamwork, conflict resolution, or problem-solving situations
- Use STAR method framework (Situation, Task, Action, Result)
- Make it relevant to software engineering team environments
- Reference their experience level and background when appropriate
- Assess cultural fit and professional growth mindset
- Questions should be answerable through storytelling and examples from experience

Generate only the question, no answers or explanations.
"""
    else:
        # Fallback to general question
        prompt = f"""
You are an AI interviewer. Generate a technical discussion question about the following topic.

Topic: {topic}
Resume Context: {resume_context}

Instructions:
- Generate a discussion-based question that can be answered verbally
- Focus on tech stack, development practices, or conceptual understanding
- NO algorithm design, coding, or complex system design required
- The question should test practical knowledge through explanation
- Make it relevant to real development experience
- Format the output as just the question text
"""

    try:
        # Use Groq to generate the question with appropriate system message
        system_messages = {
            "DSA_Theory": "You are an expert technical interviewer specializing in DSA concepts discussion. Generate questions that test understanding through verbal explanation, NOT algorithm design or coding. Focus on concept explanation and trade-offs.",
            "Project_Based": "You are an expert technical interviewer specializing in tech stack and development practices. Generate questions about technology choices, frameworks, tools, and development experience that can be answered through discussion.",
            "Behavioral": "You are an expert behavioral interviewer specializing in software engineering teams. Generate insightful questions that reveal candidate's soft skills and cultural fit through storytelling.",
            "general": "You are a helpful AI interviewer focused on discussion-based questions."
        }
        
        system_content = system_messages.get(question_type, system_messages["general"])
        
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system_content},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=300
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating {question_type} question for topic '{topic}': {e}")
        return f"Could not generate {question_type} question for topic: {topic}"

# Example usage (commented out):
# merge_hr_with_hot_topics(HR_prompt, get_interview_topics("Microsoft", "SDE Intern"))


def get_questions(resume_file, HR_prompt, company, role):
    """
    Main function to generate interview questions based on resume and company/role.
    
    Args:
        resume_file: PDF file object containing the candidate's resume
        HR_prompt: HR instructions for evaluation
        company: Company name for the role
        role: Role/position name
    
    Returns:
        dict: Generated questions organized by topic
    """
    # Verify API keys are available
    if not os.getenv("GROQ_API_KEY"):
        raise ValueError("GROQ_API_KEY not found in environment variables")
    if not os.getenv("PERPLEXITY_API_KEY"):
        raise ValueError("PERPLEXITY_API_KEY not found in environment variables")
    
    text = parse_resume(resume_file)
    retriever = build_retriever(text)
    final_topics = merge_hr_with_hot_topics(HR_prompt, get_interview_topics(company, role))
    questions = generate_questions(final_topics, retriever)
    return questions
