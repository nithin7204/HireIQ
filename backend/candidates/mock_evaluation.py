"""
Mock evaluation function for testing without Gemini API key
"""

def mock_evaluate_candidate_answer(question: str, answer: str, resume_content: bytes) -> dict:
    """
    Mock evaluation function that returns a sample evaluation.
    Use this for testing when Gemini API key is not configured.
    This version provides more realistic scoring based on answer quality indicators.
    """
    
    # Simple scoring based on answer length and content quality
    answer_length = len(answer.strip())
    question_length = len(question.strip())
    
    # Basic scoring logic - more realistic than before
    if answer_length < 10:
        base_score = 1  # Very short answers get very low scores
    elif answer_length < 30:
        base_score = 3  # Short answers get low scores
    elif answer_length < 80:
        base_score = 5  # Medium answers get medium scores
    elif answer_length < 150:
        base_score = 7  # Good length answers get good scores
    else:
        base_score = 8  # Very detailed answers get high base scores
    
    # Check for technical keywords (positive indicators)
    technical_keywords = [
        'api', 'database', 'algorithm', 'data structure', 'programming',
        'software', 'system', 'architecture', 'framework', 'library',
        'function', 'class', 'object', 'method', 'variable', 'scalability',
        'performance', 'security', 'testing', 'debugging', 'optimization'
    ]
    
    # Check for poor quality indicators (negative indicators)
    poor_indicators = [
        'i don\'t know', 'not sure', 'maybe', 'i think so', 'probably',
        'i guess', 'dunno', 'no idea', 'idk', 'um', 'uh', 'like'
    ]
    
    keyword_count = sum(1 for keyword in technical_keywords if keyword.lower() in answer.lower())
    poor_indicator_count = sum(1 for indicator in poor_indicators if indicator.lower() in answer.lower())
    
    # Apply bonuses and penalties
    keyword_bonus = min(2, keyword_count * 0.3)  # Up to 2 points for keywords
    poor_penalty = min(3, poor_indicator_count * 0.8)  # Up to 3 points penalty for poor indicators
    
    # Check if answer is just gibberish or very repetitive
    words = answer.lower().split()
    if len(set(words)) < len(words) * 0.3 and len(words) > 5:  # Highly repetitive
        repetitive_penalty = 2
    else:
        repetitive_penalty = 0
    
    # Calculate final score
    final_score = base_score + keyword_bonus - poor_penalty - repetitive_penalty
    final_score = max(1, min(10, final_score))  # Clamp between 1 and 10
    
    # Determine feedback based on score
    if final_score >= 8:
        quality_feedback = "High quality answer with good technical depth."
    elif final_score >= 6:
        quality_feedback = "Good answer but could be improved with more detail or technical accuracy."
    elif final_score >= 4:
        quality_feedback = "Average answer. Needs more depth and technical understanding."
    else:
        quality_feedback = "Poor answer. Lacks technical depth and understanding."
    
    return {
        "overall_score": round(final_score, 1),
        "detailed_scores": {
            "technical_accuracy": round(max(1, final_score * 0.9 - poor_penalty * 0.5), 1),
            "relevance_to_question": round(max(1, final_score * 1.0), 1),
            "depth_of_understanding": round(max(1, final_score * 0.8 + keyword_bonus * 0.3), 1),
            "resume_alignment": round(max(1, final_score * 0.7), 1),
            "communication_clarity": round(max(1, final_score * 1.0 - repetitive_penalty), 1),
            "problem_solving_approach": round(max(1, final_score * 0.9), 1)
        },
        "feedback": f"Mock evaluation: {quality_feedback} Score: {final_score}/10 (Length: {answer_length} chars, Keywords: {keyword_count}, Quality issues: {poor_indicator_count}). Configure GEMINI_API_KEY for real AI evaluation.",
        "strengths": f"Answer length: {answer_length} characters. Technical keywords found: {keyword_count}." + (" Good technical vocabulary used." if keyword_count > 2 else ""),
        "areas_for_improvement": f"{'Avoid uncertainty phrases. ' if poor_indicator_count > 0 else ''}{'Reduce repetition. ' if repetitive_penalty > 0 else ''}Configure GEMINI_API_KEY for detailed AI-powered feedback.",
        "resume_insights": "Mock evaluation - resume analysis not available without GEMINI_API_KEY",
        "is_mock": True,
        "mock_reason": "GEMINI_API_KEY not configured"
    }


# Test the mock function
if __name__ == "__main__":
    print("🧪 Testing Mock Evaluation Function")
    print("=" * 40)
    
    test_question = "What is the difference between REST and GraphQL?"
    test_answer = "REST uses HTTP methods and multiple endpoints, while GraphQL uses a single endpoint with flexible queries. GraphQL allows clients to request specific data, reducing over-fetching."
    test_resume = b"Mock resume content"
    
    result = mock_evaluate_candidate_answer(test_question, test_answer, test_resume)
    
    print(f"Question: {test_question}")
    print(f"Answer: {test_answer}")
    print(f"Score: {result['overall_score']}/10")
    print(f"Feedback: {result['feedback']}")
    print(f"Is Mock: {result['is_mock']}")
    print()
    print("✅ Mock evaluation system working!")
    print("📝 Configure GEMINI_API_KEY for real AI evaluation")