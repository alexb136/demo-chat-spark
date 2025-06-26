import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  text: string;
  type: 'creator' | 'customer';
  timestamp: Date;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hey there! What can I help you with today?",
      type: 'creator',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputValue.trim()) {
      return;
    }

    const messageText = inputValue.trim();
    setIsLoading(true);

    // Action A: Add customer message to chat history instantly
    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      type: 'customer',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    setInputValue('');

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      text: "AI is typing...",
      type: 'creator',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, typingMessage]);

    // Action B: Send to webhook and process response
    try {
      const response = await fetch('https://burtsevtest.app.n8n.cloud/webhook-test/aichatdemo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText
        }),
      });

      console.log('Webhook response status:', response.status);

      if (response.ok) {
        let responseMessage = '';
        
        try {
          // Try to parse as JSON first
          const responseData = await response.json();
          console.log('Webhook response data:', responseData);
          
          // Extract message from various possible JSON structures
          if (responseData.response) {
            responseMessage = responseData.response;
          } else if (responseData.message) {
            responseMessage = responseData.message;
          } else if (responseData.text) {
            responseMessage = responseData.text;
          } else if (typeof responseData === 'string') {
            responseMessage = responseData;
          } else {
            responseMessage = JSON.stringify(responseData);
          }
        } catch (jsonError) {
          // If JSON parsing fails, treat as plain text
          console.log('Response is not JSON, treating as plain text');
          responseMessage = await response.text();
        }

        // Remove typing indicator and add actual response
        setMessages(prev => {
          const withoutTyping = prev.filter(msg => msg.id !== 'typing');
          return [...withoutTyping, {
            id: (Date.now() + 1).toString(),
            text: responseMessage || 'No response received',
            type: 'creator',
            timestamp: new Date()
          }];
        });

        toast({
          title: "Response received",
          description: "AI has responded to your message.",
        });
      } else {
        // Remove typing indicator on error
        setMessages(prev => prev.filter(msg => msg.id !== 'typing'));
        
        toast({
          title: "Webhook Error",
          description: `Server responded with status ${response.status}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Webhook error:', error);
      
      // Remove typing indicator on error
      setMessages(prev => prev.filter(msg => msg.id !== 'typing'));
      
      toast({
        title: "Connection Error",
        description: "Failed to connect to the webhook. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-[700px] bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Customer Chat Simulator
          </h1>
          <h3 className="text-lg text-gray-600 font-medium">
            Demo Environment
          </h3>
        </div>

        {/* Chat History Area */}
        <div 
          ref={chatHistoryRef}
          className="h-[450px] bg-gray-50 border-2 border-gray-200 p-4 overflow-y-auto"
          style={{ backgroundColor: '#f5f5f5' }}
        >
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'customer' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg shadow-sm ${
                    message.type === 'customer'
                      ? 'bg-blue-500 text-white rounded-br-none'
                      : message.id === 'typing'
                      ? 'bg-gray-300 text-gray-600 border border-gray-200 rounded-bl-none animate-pulse'
                      : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  {message.id !== 'typing' && (
                    <p className={`text-xs mt-1 ${
                      message.type === 'customer' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message Input Section */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex gap-3">
            <Input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 h-12 text-base"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              className="h-12 px-6 bg-blue-500 hover:bg-blue-600 text-white font-medium"
              disabled={isLoading || !inputValue.trim()}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Index;
