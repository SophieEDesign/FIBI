import { NextRequest, NextResponse } from 'next/server'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

interface AIEnrichmentRequest {
  url: string
  title: string | null
  description: string | null
  domain: string | null
  platform: string | null
  scrapedContent: string | null // Scraped visible text from the page
}

interface AIEnrichmentResponse {
  suggestedTitle: string | null
  suggestedPlaceName: string | null
  suggestedCity: string | null
  suggestedCountry: string | null
  suggestedCategory: string | null
  confidence: {
    title: 'high' | 'medium' | 'low'
    location: 'high' | 'medium' | 'low'
    category: 'high' | 'medium' | 'low'
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AIEnrichmentRequest = await request.json()
    const { url, title, description, domain, platform, scrapedContent } = body

    console.log('AI enrichment API: Request received', { 
      url, 
      title, 
      description, 
      domain, 
      platform,
      hasScrapedContent: !!scrapedContent,
      scrapedContentLength: scrapedContent?.length || 0,
    })

    if (!url || typeof url !== 'string') {
      console.log('AI enrichment API: Missing URL')
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }

    // Check if AI API key is configured
    // Note: On Vercel, env vars are available at build/runtime
    const openaiKey = process.env.OPENAI_API_KEY
    const anthropicKey = process.env.ANTHROPIC_API_KEY
    const aiApiKey = openaiKey || anthropicKey
    const hasOpenAI = !!openaiKey
    const hasAnthropic = !!anthropicKey
    
    console.log('AI enrichment API: API key check', { 
      hasOpenAI, 
      hasAnthropic, 
      hasKey: !!aiApiKey,
      keyPrefix: aiApiKey ? aiApiKey.substring(0, 7) + '...' : 'none',
      envKeys: Object.keys(process.env).filter(k => k.includes('OPENAI') || k.includes('ANTHROPIC'))
    })
    
    if (!aiApiKey) {
      // If no AI key, return empty suggestions (graceful degradation)
      console.log('AI enrichment: No API key configured. Add OPENAI_API_KEY or ANTHROPIC_API_KEY to Vercel environment variables.')
      return NextResponse.json({
        suggestedTitle: null,
        suggestedPlaceName: null,
        suggestedCity: null,
        suggestedCountry: null,
        suggestedCategory: null,
        confidence: {
          title: 'low',
          location: 'low',
          category: 'low',
        },
      })
    }
    
    console.log('AI enrichment API: API key found, proceeding with AI call', { usingProvider: hasOpenAI ? 'OpenAI' : 'Anthropic' })

    // Prepare context for AI
    const context = {
      url,
      title: title || '',
      description: description || '',
      domain: domain || '',
      platform: platform || '',
      scrapedContent: scrapedContent || '',
    }

    // Use OpenAI API (can be switched to Anthropic/Claude if needed)
    const useOpenAI = !!process.env.OPENAI_API_KEY
    const apiUrl = useOpenAI
      ? 'https://api.openai.com/v1/chat/completions'
      : 'https://api.anthropic.com/v1/messages'

    const prompt = `You are helping enhance a saved place entry in a travel/inspiration app called FiBi.

Given the following information extracted from a shared link:
- URL: ${context.url}
- Title: ${context.title || '(not provided)'}
- Description: ${context.description || '(not provided)'}
- Domain: ${context.domain || '(not provided)'}
- Platform: ${context.platform || '(not provided)'}
${context.scrapedContent ? `- Page Content (scraped): ${context.scrapedContent.substring(0, 1500)}${context.scrapedContent.length > 1500 ? '...' : ''}` : ''}

Please suggest improvements. IMPORTANT RULES:
1. For title: ALWAYS suggest a cleaner, shorter version. Even if the title seems fine, try to improve it (remove extra words, make it more concise, remove platform-specific text like "Instagram" or "TikTok"). Only return null if the title is already perfect.
2. For location: AGGRESSIVELY extract any place name, city, or country mentioned. Look in the URL, title, description, and domain. Even if confidence is low, suggest it (we'll mark confidence as "low"). Examples: "Cornwall" from "cornwall" in URL, "Lisbon" from description, "Portugal" from context.
3. For category: ALWAYS suggest a category based on the content. Use context clues: restaurant/food mentions = "Food", hotel/accommodation = "Stay", beach/ocean = "Beach", hiking/nature = "Nature", city/urban = "City", activity/experience = "Activity". If truly unclear, use "Other".
4. Be smart: Use the URL domain (e.g., "tripadvisor.com" might suggest a place), platform (Instagram/TikTok often have location tags), and description text to extract information.

Return ONLY a JSON object with this exact structure:
{
  "suggestedTitle": "clean title or null",
  "suggestedPlaceName": "place name or null",
  "suggestedCity": "city name or null",
  "suggestedCountry": "country name or null",
  "suggestedCategory": "Food|Stay|Nature|Activity|City|Beach|Other or null",
  "confidence": {
    "title": "high|medium|low",
    "location": "high|medium|low",
    "category": "high|medium|low"
  }
}

Be conservative - if you're not confident, return null and set confidence to "low".`

    let aiResponse: any

    if (useOpenAI) {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Use cheaper model for cost efficiency
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that extracts and suggests improvements for travel place entries. Always return valid JSON only.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent results
          max_tokens: 300,
        }),
      })

        if (!response.ok) {
          const errorText = await response.text()
          let errorMessage = `OpenAI API error: ${response.status}`
          
          try {
            const errorData = JSON.parse(errorText)
            if (errorData.error?.message) {
              errorMessage = `OpenAI API error: ${errorData.error.message}`
            }
          } catch {
            // If parsing fails, use the raw error text
            errorMessage = `OpenAI API error: ${response.status} - ${errorText}`
          }
          
          console.error('OpenAI API error:', response.status, errorText)
          
          // For quota errors, return graceful degradation instead of throwing
          if (response.status === 429) {
            console.warn('OpenAI quota exceeded. Returning empty suggestions.')
            return NextResponse.json({
              suggestedTitle: null,
              suggestedPlaceName: null,
              suggestedCity: null,
              suggestedCountry: null,
              suggestedCategory: null,
              confidence: {
                title: 'low',
                location: 'low',
                category: 'low',
              },
              error: 'AI service temporarily unavailable (quota exceeded)',
            })
          }
          
          throw new Error(errorMessage)
        }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) {
        throw new Error('No content in OpenAI response')
      }

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in OpenAI response')
      }
    } else {
      // Anthropic Claude
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307', // Fast and cost-effective
          max_tokens: 300,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      })

        if (!response.ok) {
          const errorText = await response.text()
          let errorMessage = `Anthropic API error: ${response.status}`
          
          try {
            const errorData = JSON.parse(errorText)
            if (errorData.error?.message) {
              errorMessage = `Anthropic API error: ${errorData.error.message}`
            }
          } catch {
            // If parsing fails, use the raw error text
            errorMessage = `Anthropic API error: ${response.status} - ${errorText}`
          }
          
          console.error('Anthropic API error:', response.status, errorText)
          
          // For quota errors, return graceful degradation instead of throwing
          if (response.status === 429) {
            console.warn('Anthropic quota exceeded. Returning empty suggestions.')
            return NextResponse.json({
              suggestedTitle: null,
              suggestedPlaceName: null,
              suggestedCity: null,
              suggestedCountry: null,
              suggestedCategory: null,
              confidence: {
                title: 'low',
                location: 'low',
                category: 'low',
              },
              error: 'AI service temporarily unavailable (quota exceeded)',
            })
          }
          
          throw new Error(errorMessage)
        }

      const data = await response.json()
      const content = data.content?.[0]?.text
      if (!content) {
        throw new Error('No content in Anthropic response')
      }

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in Anthropic response')
      }
    }

    // Validate and sanitize response
    const result: AIEnrichmentResponse = {
      suggestedTitle: aiResponse.suggestedTitle && typeof aiResponse.suggestedTitle === 'string' 
        ? aiResponse.suggestedTitle.trim() || null 
        : null,
      suggestedPlaceName: aiResponse.suggestedPlaceName && typeof aiResponse.suggestedPlaceName === 'string'
        ? aiResponse.suggestedPlaceName.trim() || null
        : null,
      suggestedCity: aiResponse.suggestedCity && typeof aiResponse.suggestedCity === 'string'
        ? aiResponse.suggestedCity.trim() || null
        : null,
      suggestedCountry: aiResponse.suggestedCountry && typeof aiResponse.suggestedCountry === 'string'
        ? aiResponse.suggestedCountry.trim() || null
        : null,
      suggestedCategory: aiResponse.suggestedCategory && typeof aiResponse.suggestedCategory === 'string'
        ? (['Food', 'Stay', 'Nature', 'Activity', 'City', 'Beach', 'Other'].includes(aiResponse.suggestedCategory)
          ? aiResponse.suggestedCategory
          : null)
        : null,
      confidence: {
        title: ['high', 'medium', 'low'].includes(aiResponse.confidence?.title)
          ? aiResponse.confidence.title
          : 'low',
        location: ['high', 'medium', 'low'].includes(aiResponse.confidence?.location)
          ? aiResponse.confidence.location
          : 'low',
        category: ['high', 'medium', 'low'].includes(aiResponse.confidence?.category)
          ? aiResponse.confidence.category
          : 'low',
      },
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('AI enrichment error:', error)
    // Return empty suggestions on error (non-blocking)
    return NextResponse.json({
      suggestedTitle: null,
      suggestedPlaceName: null,
      suggestedCity: null,
      suggestedCountry: null,
      suggestedCategory: null,
      confidence: {
        title: 'low',
        location: 'low',
        category: 'low',
      },
    })
  }
}

