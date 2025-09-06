from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document

from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.schema import Document

import os
from langchain_groq import ChatGroq
import requests
from dotenv import load_dotenv

import json
import re
import random

import fitz
from groq import Groq

# Load environment variables from .env file
load_dotenv()

def get_interview_topics(company: str, role: str, extra_topics: str = ""):
    """
    Ask Perplexity Sonar for important interview topics for a given company & role.

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

    query = f"List the most important technical interview topics for {company} {role}. \
               Focus also on: {extra_topics} if relevant. \
               Return only a clean list of topics, no explanation."

    payload = {
        "model": "sonar",
        "messages": [
            {"role": "system", "content": "You are an expert in technical hiring and interview preparation."},
            {"role": "user", "content": query}
        ],
        "max_tokens": 300
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
    using Groq DeepSeek reasoning model.
    """
    # Initialize Groq client
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    if hot_topics is None:
        hot_topics = ["Arrays", "Graphs", "Dynamic Programming", "Linked List", "Hashing"]

    # Generate recruiter instruction if not provided
    if hr_prompt is None:
        gen_response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are an HR assistant. Generate short recruiter instructions for SDE Intern candidate evaluation."},
                {"role": "user", "content": "Create a recruiter-style interview instruction prompt for testing candidates applying to an SDE Intern role."}
            ],
            temperature=0.3,
            max_tokens=100
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
            {"role": "system", "content": "You are a JSON generator. Always output ONLY valid JSON following the given schema. Never include explanations or reasoning."},
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
    docs = retriever.get_relevant_documents(query)
    return [doc.page_content for doc in docs]


def build_retriever(text: str, persist_directory: str = "chroma_db_00"):
    """
    Chunks text, creates embeddings, and builds a ChromaDB retriever.
    """
    # Split into chunks
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=100, chunk_overlap=20)
    chunks = text_splitter.split_text(text)

    # Convert to Documents
    documents = [Document(page_content=chunk) for chunk in chunks]

    # Embeddings
    embedding = HuggingFaceEmbeddings(model_name="sentence-transformers/all-distilroberta-v1")

    # Build Chroma DB
    vectordb = Chroma.from_documents(
        documents,
        embedding=embedding,
        persist_directory=persist_directory
    )

    return vectordb.as_retriever(search_kwargs={"k": 5})



def generate_questions(final_topics, retriever, num_questions=5):
    all_topics = []
    for main_topic, sub_topics in final_topics.items():  # ✅ no 'main_topics'
        all_topics.extend(sub_topics)

    selected_topics = random.sample(all_topics, min(num_questions, len(all_topics)))

    generated_questions = {}
    for topic in selected_topics:
        question = generate_question(topic, retriever)
        generated_questions[topic] = question

    return generated_questions

def generate_question(topic: str, retriever) -> str:
    """
    Generates an interview question based on a topic and resume context.

    Args:
        topic (str): The technical topic for the question.
        retriever: The ChromaDB retriever object to get resume context.

    Returns:
        str: The generated interview question.
    """
    # Initialize Groq client
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    
    # Retrieve relevant context from the resume based on the topic
    resume_context_docs = retriever.get_relevant_documents(topic)
    resume_context = "\n".join([doc.page_content for doc in resume_context_docs])

    # Build the prompt for the language model
    prompt = f"""
You are an AI interviewer. Generate a technical interview question about the following topic,
potentially referencing the candidate's resume context if relevant.

Topic: {topic}

Resume Context:
{resume_context}

Instructions:
- Generate only one question.
- The question should be concise and relevant to the topic and resume context.
- Do NOT include the answer.
- Do NOT ask about the candidate's personal information or experience directly.
- Format the output as just the question text.
"""

    try:
        # Use Groq to generate the question
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are a helpful AI interviewer."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=200
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Error generating question for topic '{topic}': {e}")
        return f"Could not generate question for topic: {topic}"

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