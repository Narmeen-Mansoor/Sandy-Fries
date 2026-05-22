import React, { useState, useRef, useEffect } from "react";
import { 
  ShoppingBag, 
  Send, 
  MapPin, 
  Truck, 
  Flame, 
  Sparkles, 
  HelpCircle, 
  Check, 
  Compass, 
  Plus, 
  Minus, 
  Smile, 
  RefreshCw,
  Phone,
  ThumbsUp,
  Clock,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Message, Cart, FAQ } from "./types";

// Static FAQ knowledge base
const FAQs: FAQ[] = [
  {
    id: "faq_1",
    category: "product",
    question: "What makes Sandy's Fries so special?",
    answer: "It's all about that perfect crisp and golden crunch every single time! We craft them from select high-solid premium potatoes with optimal starch levels. Designed to keep families happy, whether it's movie nights or late-night Gen Z gossips."
  },
  {
    id: "faq_2",
    category: "cooking",
    question: "How do I cook Sandy's Frozen Fries?",
    answer: "Pure instant convenience! No thawing needed. Deep fry in medium-high preheated oil, air-fry at 200°C for 12-15 minutes, or bake on a sheet till beautiful golden. Serve steaming hot!"
  },
  {
    id: "faq_3",
    category: "delivery",
    question: "What are the delivery charges and times across Pakistan?",
    answer: "Within Karachi: super-fast delivery in 24–48 hours. Rest of Pakistan (Lahore, Islamabad, etc.): 2–3 business days. Delivery is a flat Rs. 200, but completely FREE if you order 3 or more bags!"
  },
  {
    id: "faq_4",
    category: "product",
    question: "What does the packaging look like?",
    answer: "A beautiful green and white premium bag layout with rich golden accents. Features our signature mascot – a sophisticated, friendly elderly gentleman holding a fresh cup of hot fries!"
  }
];

export default function App() {
  // Conversational state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial_1",
      role: "assistant",
      text: "👋 **Assalam-o-Alaikum, French Fry lover!** Sandy's AI Fry-Guide at your service! 🍟✨\n\nI am absolute crazy about getting you that premium, crunchy family delight on your table! Our premium frozen bags are exactly **Rs. 1,500 each**.\n\nTell me, where are you located (City & Area) so we can check delivery and get some golden crisps cooking for you? Karachi is 24-48 hours, and nationwide is 2-3 days!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // Shopping cart settings
  const [cart, setCart] = useState<Cart>({
    quantity: 1,
    pricePerBag: 1500,
    deliveryFee: 200,
    city: "",
    area: ""
  });

  // Client-side visual interactive states
  const [cityInput, setCityInput] = useState("");
  const [areaInput, setAreaInput] = useState("");
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  // Chat auto-scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Flash visual toast notifications when tools trigger
  const triggerNotification = (text: string) => {
    setLastNotification(text);
    setTimeout(() => {
      setLastNotification(null);
    }, 4500);
  };

  // Programmatic function 1: select_location
  const handleSelectLocation = (city: string, area: string) => {
    if (!city || !area) return;
    const formattedCity = city.trim();
    const formattedArea = area.trim();
    
    setCart(prev => ({
      ...prev,
      city: formattedCity,
      area: formattedArea
    }));
    setCityInput(formattedCity);
    setAreaInput(formattedArea);
    
    triggerNotification(`📍 Location updated to ${formattedArea}, ${formattedCity}!`);
  };

  // Programmatic function 2: add_to_cart
  const handleAddToCart = (quantity: number, city: string, area: string) => {
    const qty = Math.max(1, quantity);
    const updatedCity = city ? city.trim() : cart.city;
    const updatedArea = area ? area.trim() : cart.area;

    // Check if free shipping applies (3 or more bags)
    const updatedDeliveryFee = qty >= 3 ? 0 : 200;

    setCart({
      quantity: qty,
      pricePerBag: 1500,
      deliveryFee: updatedDeliveryFee,
      city: updatedCity,
      area: updatedArea
    });

    if (updatedCity) {
      setCityInput(updatedCity);
    }
    if (updatedArea) {
      setAreaInput(updatedArea);
    }

    triggerNotification(`🍟 Added ${qty} Bag(s) to Cart! Price: Rs. ${qty * 1500} - shipping: ${updatedDeliveryFee === 0 ? "FREE!" : "Rs. 200"}`);
  };

  // Send message to Express API backend
  const handleSendMessage = async (textToSend?: string) => {
    const input = textToSend || userInput;
    if (!input.trim()) return;

    // Add user message locally
    const userMsgId = `user_${Date.now()}`;
    const newMsg: Message = {
      id: userMsgId,
      role: "user",
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    if (!textToSend) setUserInput("");
    setIsTyping(true);

    try {
      // Prepare chat history to feed modern context back to backend
      const historyContext = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: input,
          history: historyContext
        })
      });

      const data = await res.json();
      setIsTyping(false);

      if (data.text) {
        const assistantMsgId = `assistant_${Date.now()}`;
        
        // Add assistant message
        setMessages(prev => [...prev, {
          id: assistantMsgId,
          role: "assistant",
          text: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          functionCalls: data.functionCalls
        }]);

        // Process function calls if returned
        if (data.functionCalls && data.functionCalls.length > 0) {
          data.functionCalls.forEach((call: any) => {
            if (call.name === "select_location") {
              const { city, area } = call.args;
              handleSelectLocation(city, area);
            } else if (call.name === "add_to_cart") {
              const { quantity, city, area } = call.args;
              handleAddToCart(quantity, city, area);
            }
          });
        }
      }
    } catch (err) {
      console.error("Failed to chat with Fry-Guide server", err);
      setIsTyping(false);
      // Fallback message
      setMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        role: "assistant",
        text: "Oops, my fry-engine sizzled for a second! 🍟 But my loyalty never waivers. Let me know how many bags of Sandy's Frozen Fries you want to buy, and tell me your location so I can pack them up!",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  // Submit delivery coordinates form manually through UI
  const handleSaveLocationForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cityInput.trim() || !areaInput.trim()) return;
    
    handleSelectLocation(cityInput, areaInput);
    setShowLocationModal(false);

    // Ask AI in chat to adapt to the newly provided location
    handleSendMessage(`My delivery coordinates are City: ${cityInput}, Area: ${areaInput}`);
  };

  // Handle visual increment/decrement in Cart panel
  const updateCartQty = (newQty: number) => {
    const qty = Math.max(1, newQty);
    handleAddToCart(qty, cart.city, cart.area);
  };

  // Quick QA chips clicks
  const handleFaqClick = (faq: FAQ) => {
    handleSendMessage(faq.question);
  };

  // Calculate pricing values
  const rawSubtotal = cart.quantity * 1500;
  const currentShipping = cart.quantity >= 3 ? 0 : 200;
  const grandTotal = rawSubtotal + currentShipping;

  // Simulate complete checkout
  const handleCheckoutSubmit = () => {
    if (!cart.city || !cart.area) {
      setShowLocationModal(true);
      triggerNotification("⚠️ Please specify your City & Area before checkout!");
      return;
    }
    setIsOrderPlaced(true);
  };

  return (
    <div id="app_root" className="min-h-screen bg-[#F0F5F1] text-gray-800 font-sans flex flex-col antialiased">
      
      {/* Visual Floating Notifications */}
      <AnimatePresence>
        {lastNotification && (
          <motion.div 
            id="toast_notification"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#004B23] border-2 border-[#D4AF37] text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 font-medium text-sm sm:text-base max-w-[90%]"
          >
            <div className="p-1 rounded-full bg-[#FFB703] text-[#004B23]">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <span>{lastNotification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main App Header */}
      <header id="app_header" className="sticky top-0 z-40 bg-white border-b-4 border-[#004B23] shadow-md px-4 sm:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo & Branding */}
          <div className="flex items-center gap-4">
            {/* Custom Styled SVG mascot avatar inside green ring */}
            <div className="relative w-14 h-14 rounded-full bg-[#F0F5F1] border-2 border-[#D4AF37] flex items-center justify-center shadow-inner overflow-hidden">
              <svg className="w-12 h-12" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Hair */}
                <circle cx="50" cy="40" r="28" fill="#EAEAEA" />
                <path d="M22 40C22 25 35 12 50 12C65 12 78 25 78 40" fill="#FFFFFF" />
                {/* Head */}
                <circle cx="50" cy="48" r="20" fill="#FFDFC4" />
                {/* Elderly specs */}
                <rect x="35" y="44" width="12" height="8" rx="2" stroke="#555" strokeWidth="2" />
                <rect x="53" y="44" width="12" height="8" rx="2" stroke="#555" strokeWidth="2" />
                <line x1="47" y1="48" x2="53" y2="48" stroke="#555" strokeWidth="2" />
                {/* Monocle detail/Gold accent */}
                <circle cx="41" cy="48" r="7" stroke="#D4AF37" strokeWidth="1.5" />
                {/* Apron strap */}
                <path d="M40 68L50 56L60 68" stroke="#004B23" strokeWidth="3" />
                {/* Smile & rosy cheeks */}
                <path d="M45 57C45 61 55 61 55 57" stroke="#E63946" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="34" cy="54" r="3" fill="#FAA" opacity="0.6" />
                <circle cx="66" cy="54" r="3" fill="#FAA" opacity="0.6" />
              </svg>
              <div className="absolute -bottom-1 right-0 rounded-full bg-[#004B23] p-1 border border-white">
                <Flame className="w-3 h-3 text-[#FFB703] fill-[#FFB703]" />
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-[#004B23] tracking-tight">
                  Sandy's <span className="text-[#FFB703]">AI Fry-Guide</span>
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-yellow-100 text-[#FFB703] border border-yellow-300 px-2 py-0.5 rounded-full animate-pulse">
                  Pakistan 🇵🇰
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium italic">
                “Sandy Frozen Fries – Har Bite Mein Family Delight”
              </p>
            </div>
          </div>

          {/* Delivery Region Indicator */}
          <div className="flex items-center gap-3">
            <button 
              id="location_selector_btn"
              onClick={() => setShowLocationModal(true)}
              className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 hover:border-[#004B23] text-gray-700 text-sm font-semibold transition"
            >
              <MapPin className="w-4 h-4 text-[#004B23] group-hover:animate-bounce" />
              <div className="text-left leading-tight">
                <div className="text-[10px] text-gray-400 font-normal uppercase">Region Scope</div>
                <div id="current_location_label" className="text-xs sm:text-sm font-bold text-[#004B23] max-w-[150px] truncate">
                  {cart.city ? `${cart.area}, ${cart.city}` : "Set Pakistan Location"}
                </div>
              </div>
            </button>
            
            <a 
              href="https://wa.me/923000000000" 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm"
            >
              <Phone className="w-4 h-4 fill-white" />
              <span className="hidden md:inline">WhatsApp Order</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main id="app_main" className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Storefront, Premium Bag Showcase & Billing Checkout (5 cols on lg) */}
        <section id="storefront_panel" className="lg:col-span-5 flex flex-col gap-6 order-2 lg:order-1">
          
          {/* Packaging Bag Mockup Card */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-md border border-gray-100 flex flex-col">
            <div className="bg-gradient-to-br from-[#004B23] to-[#002A14] p-5 relative overflow-hidden text-white">
              
              {/* Absolutes for visual aesthetics */}
              <div className="absolute top-0 right-0 w-28 h-28 bg-[#FFB703] opacity-10 rounded-full blur-xl"></div>
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white opacity-5 rounded-full"></div>
              
              <div className="flex justify-between items-start">
                <span className="text-xs bg-[#FFB703] text-[#004B23] font-black uppercase px-2.5 py-1 rounded-full tracking-wider">
                  PREMIUM QUALITY
                </span>
                <span className="text-xs font-mono font-bold tracking-tight text-yellow-300">
                  Select High-Solid Spuds
                </span>
              </div>

              {/* Custom CSS/SVG Bag Front Package Visualization */}
              <div className="my-6 flex justify-center">
                <div className="relative w-44 h-56 bg-white rounded-2xl shadow-2xl border-4 border-[#004B23] overflow-hidden transform hover:scale-105 transition-transform duration-300">
                  {/* Top Header forest green fold */}
                  <div className="h-10 bg-[#004B23] flex items-center justify-between px-3 text-white text-[9px] uppercase font-bold tracking-wider">
                    <span>Premium Bag</span>
                    <Sparkles className="w-3 h-3 text-[#FFB703] animate-pulse" />
                  </div>
                  
                  {/* Golden diagonal ribbons */}
                  <div className="absolute top-10 left-0 w-full h-1 bg-[#D4AF37]"></div>
                  <div className="absolute top-11 left-0 w-full h-1 bg-yellow-400" opacity="0.5"></div>
                  
                  {/* Mascot Circle */}
                  <div className="absolute top-14 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-slate-50 border-2 border-[#D4AF37] flex items-center justify-center overflow-hidden shadow-md">
                    <svg className="w-14 h-14" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="50" cy="40" r="28" fill="#EAEAEA" />
                      <path d="M22 40C22 25 35 12 50 12C65 12 78 25 78 40" fill="#FFFFFF" />
                      <circle cx="50" cy="48" r="20" fill="#FFDFC4" />
                      <rect x="35" y="44" width="12" height="8" rx="2" stroke="#555" strokeWidth="2" />
                      <rect x="53" y="44" width="12" height="8" rx="2" stroke="#555" strokeWidth="2" />
                      <circle cx="41" cy="48" r="7" stroke="#D4AF37" strokeWidth="1.5" />
                      <path d="M45 57C45 61 55 61 55 57" stroke="#E63946" strokeWidth="2.5" />
                    </svg>
                  </div>

                  {/* Golden lines and branding layout */}
                  <div className="absolute bottom-0 left-0 w-full h-24 bg-[#004B23] text-white flex flex-col justify-between p-2 text-center">
                    <div className="h-0.5 bg-[#D4AF37] mb-1"></div>
                    <div>
                      <h4 className="text-[11px] font-black tracking-tighter uppercase leading-none text-yellow-300">
                        Sandy's
                      </h4>
                      <p className="text-[7px] font-medium tracking-wide uppercase leading-tight text-white mb-1">
                        Frozen Premium Fries
                      </p>
                      <p className="text-[5px] text-gray-300 italic">"Har Bite Mein Family Delight"</p>
                    </div>
                    {/* Weight and badge info */}
                    <div className="flex justify-between items-center text-[6px] text-yellow-300 font-mono mt-1 border-t border-green-800 pt-1">
                      <span>1 PACK</span>
                      <span className="bg-white text-[#004B23] px-1 rounded">Rs. 1,500</span>
                      <span>100% GOLD</span>
                    </div>
                  </div>
                  
                  {/* Real visual fries falling SVG graphic background */}
                  <div className="absolute right-2 top-20 w-8 h-8 opacity-25">
                    <svg viewBox="0 0 40 40" className="w-full h-full text-[#FFB703] fill-current">
                      <rect x="5" y="10" width="4" height="20" rx="1" transform="rotate(-15 5 10)" />
                      <rect x="15" y="5" width="4" height="25" rx="1" transform="rotate(5 15 5)" />
                      <rect x="25" y="8" width="4" height="22" rx="1" transform="rotate(25 25 8)" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="text-center relative z-10">
                <h3 className="text-lg font-bold">Premium Frozen Bag</h3>
                <p className="text-xs text-green-100 opacity-90 mt-1">
                  Pure convenience & crispiness packed in green, white & gold. No thawing! Deep-fry, air-fry or bake.
                </p>
                <div className="mt-3 flex justify-center items-center gap-1.5 text-xs text-yellow-300 font-bold bg-green-900/40 py-1.5 px-3 rounded-full w-max mx-auto border border-green-800">
                  <Flame className="w-3.5 h-3.5 fill-[#FFB703] text-[#FFB703]" />
                  <span>Ultimate Crispy Gold Texture</span>
                </div>
              </div>
            </div>

            {/* Shopping & Order Interactive Panel */}
            <div className="p-6 flex flex-col gap-5">
              
              {/* Product Price & Counter */}
              <div className="flex items-center justify-between pointer-events-auto bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div>
                  <span className="text-xs text-gray-400 font-semibold block uppercase">PRICE PER BAG</span>
                  <span className="text-xl font-extrabold text-gray-900">Rs. 1,500</span>
                </div>
                
                {/* Visual Counter */}
                <div className="flex items-center gap-3 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
                  <button 
                    id="decrease_qty_btn"
                    onClick={() => updateCartQty(cart.quantity - 1)}
                    className="w-10 h-10 rounded-lg hover:bg-gray-50 flex items-center justify-center text-gray-500 hover:text-[#004B23] transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span id="cart_qty_value" className="text-lg font-extrabold w-8 text-center text-[#004B23]">
                    {cart.quantity}
                  </span>
                  <button 
                    id="increase_qty_btn"
                    onClick={() => updateCartQty(cart.quantity + 1)}
                    className="w-10 h-10 rounded-lg hover:bg-gray-50 flex items-center justify-center text-[#004B23] font-bold transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress bar tracking for FREE Shipping (Requires >= 3 bags) */}
              <div className="bg-yellow-50/50 border border-yellow-200/60 rounded-2xl p-4">
                <div className="flex justify-between items-center text-xs text-gray-700 font-bold mb-2">
                  <div className="flex items-center gap-1.5 text-[#004B23]">
                    <Truck className="w-3.5 h-3.5 animate-bounce" />
                    <span>Free Shipping Goal</span>
                  </div>
                  <span>
                    {cart.quantity >= 3 ? "Unlocked! 🎉" : `${cart.quantity}/3 Bags`}
                  </span>
                </div>
                
                {/* Simple dynamic slider progress */}
                <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden mb-1.5">
                  <div 
                    className="bg-gradient-to-r from-yellow-400 to-[#FFB703] h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (cart.quantity / 3) * 100)}%` }}
                  ></div>
                </div>

                <p className="text-[11px] text-gray-500 font-medium">
                  {cart.quantity >= 3 ? (
                    <span className="text-[#004B23] font-bold block">👏 Shabash! You get free nationwide delivery with Rs. 0 shipping fee!</span>
                  ) : (
                    <span>Add <strong className="text-[#004B23]">{3 - cart.quantity} more</strong> bag(s) to unlock **FREE Nationwide Delivery!** (Save Rs. 200)</span>
                  )}
                </p>
              </div>

              {/* Invoice Breakdown */}
              <div className="border-t border-gray-100 pt-4 flex flex-col gap-2.5 font-mono text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal ({cart.quantity} Bag{cart.quantity > 1 ? "s" : ""})</span>
                  <span>Rs. {rawSubtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-500 items-center">
                  <span className="flex items-center gap-1">
                    Delivery Fee 
                    {cart.quantity < 3 && (
                      <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-400 font-sans">Flat</span>
                    )}
                  </span>
                  <span>
                    {cart.quantity >= 3 ? (
                      <strong className="text-green-600 font-sans tracking-wide">FREE</strong>
                    ) : (
                      `Rs. ${cart.deliveryFee}`
                    )}
                  </span>
                </div>
                
                {/* Location context on invoice */}
                <div className="flex justify-between text-gray-500 text-xs italic border-b border-gray-100 pb-3">
                  <span>Destination Code:</span>
                  <span id="invoice_location_text" className="text-gray-700 font-semibold font-sans">
                    {cart.city ? `${cart.area}, ${cart.city}` : "— Please select location —"}
                  </span>
                </div>

                <div className="flex justify-between text-base font-extrabold text-gray-900 pt-1 font-sans">
                  <span>Grand Total</span>
                  <span id="grand_total_value" className="text-[#004B23] text-lg font-black bg-yellow-100/55 px-2 py-0.5 rounded">
                    Rs. {grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Interactive Checkout CTA */}
              <button 
                id="checkout_cta_btn"
                onClick={handleCheckoutSubmit}
                className="w-full bg-[#004B23] hover:bg-[#003819] active:scale-[0.99] text-white font-extrabold text-base py-4 px-6 rounded-2xl transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-5 h-5 text-yellow-300" />
                <span>Confirm Fresh Fries Order</span>
              </button>

            </div>
          </div>

          {/* Quick FAQ Accordion Panels (Young Moms' Cooking details & Gen Z convenience) */}
          <div className="bg-white pl-5 pr-5 pb-5 pt-4 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-[#004B23]" />
              <span>Quick Fry Knowledge Hub</span>
            </h3>
            
            <div className="flex flex-col gap-2">
              {FAQs.map(faq => (
                <button
                  key={faq.id}
                  onClick={() => handleFaqClick(faq)}
                  className="w-full text-left p-3 rounded-xl hover:bg-gray-50 border border-gray-100 hover:border-gray-200 transition text-xs flex justify-between items-center group font-medium"
                >
                  <span className="text-gray-700 font-bold group-hover:text-[#004B23]">
                    {faq.question}
                  </span>
                  <span className="text-[10px] bg-yellow-100 text-[#FFB703] font-bold px-2 py-0.5 rounded-full select-none ml-2">
                    {faq.category}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </section>

        {/* Right Side: Witty AI Fry-Guide Chat Companion Panel (7 cols on lg) */}
        <section id="chat_companion_panel" className="lg:col-span-7 flex flex-col bg-white rounded-3xl shadow-md border border-gray-100 overflow-hidden min-h-[600px] lg:h-[750px] order-1 lg:order-2">
          
          {/* Active Chat Header */}
          <div className="bg-gradient-to-r from-white to-gray-50 border-b border-gray-100 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-green-50 border border-[#D4AF37] flex items-center justify-center overflow-hidden">
                  <svg className="w-9 h-9" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="40" r="28" fill="#EAEAEA" />
                    <circle cx="50" cy="48" r="20" fill="#FFDFC4" />
                    <rect x="35" y="44" width="12" height="8" rx="2" stroke="#555" strokeWidth="2" />
                    <rect x="53" y="44" width="12" height="8" rx="2" stroke="#555" strokeWidth="2" />
                    <path d="M45 57C45 61 55 61 55 57" stroke="#E63946" strokeWidth="2.5" />
                  </svg>
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
              </div>
              
              <div>
                <h2 className="text-base font-extrabold text-[#004B23] tracking-tight flex items-center gap-1.5">
                  Sandy's AI Fry-Guide
                </h2>
                <div className="flex items-center gap-1 text-[11px] text-gray-400 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping"></span>
                  <span>Online • Sizzling & Sassy 🍟</span>
                </div>
              </div>
            </div>

            <button 
              id="clear_chat_btn"
              onClick={() => {
                setMessages([
                  {
                    id: `reset_${Date.now()}`,
                    role: "assistant",
                    text: "*Sandy's mascot dusts off his emerald apron!* \n\nChalo, let's start fresh! Where across Pakistan can I send some premium crispy bites? Tell me your City and Area!",
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                ]);
              }}
              title="Reset Chat"
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Chat Messages Log Area */}
          <div id="chat_messages_container" className="flex-1 overflow-y-auto p-5 bg-[#FDFDFD] space-y-4 relative">
            
            {/* Soft grid watermark */}
            <div className="absolute inset-0 bg-[radial-gradient(#E8EBE9_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-40"></div>
            
            <AnimatePresence initial={false}>
              {messages.map(msg => {
                const isUser = msg.role === "user";
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${isUser ? "justify-end" : "justify-start"} relative z-10`}
                  >
                    <div className={`flex gap-2.5 max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                      
                      {/* Avatar inside bubble row */}
                      {!isUser && (
                        <div className="w-8 h-8 rounded-full bg-green-50 border border-[#D4AF37] flex-shrink-0 flex items-center justify-center text-xs overflow-hidden">
                          <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
                            <circle cx="50" cy="40" r="28" fill="#D8D8D8" />
                            <circle cx="50" cy="48" r="20" fill="#FFDFC4" />
                            <path d="M45 57C45 61 55 61 55 57" stroke="#E63946" strokeWidth="4" />
                          </svg>
                        </div>
                      )}

                      <div>
                        {/* Bubble */}
                        <div 
                          className={`rounded-2xl p-4 text-xs sm:text-sm shadow-sm leading-relaxed ${
                            isUser 
                              ? "bg-[#004B23] text-white rounded-tr-none" 
                              : "bg-white border border-gray-100 text-gray-800 rounded-tl-none"
                          }`}
                        >
                          {/* Parse bolding stars easily for UI */}
                          <p className="whitespace-pre-line">
                            {msg.text.split("\n").map((line, lIdx) => {
                              // Process inline bold strings e.g. **text**
                              const parts = line.split(/\*\*([^*]+)\*\*/g);
                              return (
                                <span key={lIdx} className="block min-h-[0.5em]">
                                  {parts.map((part, pIdx) => {
                                    // Odd indices contain bold terms
                                    return pIdx % 2 === 1 ? (
                                      <strong key={pIdx} className={isUser ? "text-yellow-300 font-extrabold" : "text-[#004B23] font-extrabold"}>
                                        {part}
                                      </strong>
                                    ) : part;
                                  })}
                                </span>
                              );
                            })}
                          </p>
                          
                          {/* If functioncall is run as a result of this message */}
                          {msg.functionCalls && (
                            <div className="mt-3.5 pt-3.5 border-t border-dashed border-gray-100 flex flex-wrap gap-2">
                              {msg.functionCalls.map((fc: any, fcIdx: number) => (
                                <span key={fcIdx} className="inline-flex items-center gap-1 text-[10px] sm:text-xs bg-yellow-100 border border-yellow-300 text-[#004B23] font-bold px-2.5 py-1 rounded-lg">
                                  <Sparkles className="w-3 h-3 text-[#FFB703] fill-[#FFB703]" />
                                  <span>Action: {fc.name} (Qty: {fc.args?.quantity || 1})</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <span className={`text-[10px] text-gray-400 block mt-1 ${isUser ? "text-right" : "text-left"}`}>
                          {msg.timestamp}
                        </span>
                      </div>

                    </div>
                  </motion.div>
                );
              })}

              {/* Typing simulation */}
              {isTyping && (
                <motion.div 
                  id="bot_typing_indicator"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start gap-2.5 items-center relative z-10"
                >
                  <div className="w-8 h-8 rounded-full bg-green-50 border border-[#D4AF37] flex items-center justify-center">
                    <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none">
                      <circle cx="50" cy="40" r="28" fill="#D8D8D8" />
                      <circle cx="50" cy="48" r="20" fill="#FFDFC4" />
                    </svg>
                  </div>
                  
                  <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-none p-3.5 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#004B23] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2.5 h-2.5 bg-[#FFB703] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2.5 h-2.5 bg-[#004B23] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    <span className="text-xs font-semibold text-gray-400 font-mono ml-1.5">Sizzling extra-crisp fries...</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions Tray */}
          <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 flex gap-2 overflow-x-auto select-none no-scrollbar">
            <button 
              id="suggest_btn_different"
              onClick={() => handleSendMessage("What makes Sandy's fries different?")}
              className="flex-shrink-0 text-[11px] font-bold bg-white hover:bg-[#F0F5F1] border border-gray-200 hover:border-[#004B23] text-gray-600 hover:text-[#004B23] px-3.5 py-1.5 rounded-full transition"
            >
              🔥 Spud Quality?
            </button>
            <button 
              id="suggest_btn_cook"
              onClick={() => handleSendMessage("How do I cook them properly?")}
              className="flex-shrink-0 text-[11px] font-bold bg-white hover:bg-[#F0F5F1] border border-gray-200 hover:border-[#004B23] text-gray-600 hover:text-[#004B23] px-3.5 py-1.5 rounded-full transition"
            >
              👨‍🍳 Cooking Guide
            </button>
            <button 
              id="suggest_btn_ Karachi"
              onClick={() => handleSendMessage("Do you deliver within Karachi Clifton?")}
              className="flex-shrink-0 text-[11px] font-bold bg-white hover:bg-[#F0F5F1] border border-gray-200 hover:border-[#004B23] text-gray-600 hover:text-[#004B23] px-3.5 py-1.5 rounded-full transition"
            >
              📍 Karachi Logistics
            </button>
            <button 
              id="suggest_btn_order"
              onClick={() => {
                if (cart.city && cart.area) {
                  handleSendMessage(`Please add 3 bags to my cart for ${cart.area}, ${cart.city}`);
                } else {
                  handleSendMessage("I want to order Sandy's Frozen Fries bags!");
                }
              }}
              className="flex-shrink-0 text-[11px] font-bold bg-[#FFB703] hover:bg-yellow-500 text-[#004B23] px-3.5 py-1.5 rounded-full transition shadow-sm"
            >
              🍟 Order 3 Bags (Free Del!)
            </button>
          </div>

          {/* User Input field and Send btn */}
          <div className="p-4 bg-white border-t border-gray-100 flex gap-3">
            <input 
              id="chat_input_field"
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage();
                }
              }}
              placeholder="Ask about crisp quality, cook instructions, or type 'add 3 bags to Karachi Clifton'..."
              className="flex-grow bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs sm:text-sm focus:outline-none focus:border-[#004B23] transition-colors font-medium text-gray-800"
            />
            
            <button 
              id="chat_send_button"
              onClick={() => handleSendMessage()}
              disabled={!userInput.trim()}
              className="bg-[#004B23] hover:bg-[#003B1C] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl px-5 flex items-center justify-center transition-all shadow-sm shrink-0"
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </div>

        </section>

      </main>

      {/* FOOTER */}
      <footer id="app_footer" className="bg-[#004B23] text-white border-t-4 border-[#FFB703] mt-auto py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <h3 className="text-base font-extrabold tracking-wide text-yellow-300">
              Sandy Frozen Fries
            </h3>
            <p className="text-xs text-gray-300 mt-1">
              "Har Bite Mein Family Delight" — Flash-Frozen Premium Fries across Pakistan.
            </p>
          </div>
          
          <div className="text-xs text-gray-300 flex flex-col sm:flex-row items-center gap-2 sm:gap-6">
            <span>Price: Rs. 1,500/bag</span>
            <span className="hidden sm:inline">•</span>
            <span>Delivery: Karachi (24-48h) | Rest of PK (2-3 Days)</span>
            <span className="hidden sm:inline">•</span>
            <span>Flat Rs. 200 fee (FREE on 3+ bags)</span>
          </div>

          <p className="text-[10px] text-gray-400">
            © 2026 Sandy Frozen Fries. Fully Integrated Conversational Commerce.
          </p>
        </div>
      </footer>

      {/* PERSISTENT MODALS & POPUPS */}

      {/* 1. Location Selection Modal (Flow A) */}
      <AnimatePresence>
        {showLocationModal && (
          <div id="location_modal_overlay" className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              id="location_modal_card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-md border border-gray-100"
            >
              <div className="bg-[#004B23] p-5 text-white flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <MapPin className="text-yellow-300 w-5 h-5 animate-bounce" />
                  <h3 className="text-lg font-black tracking-tight">Set Delivery Coordinates</h3>
                </div>
                <button 
                  onClick={() => setShowLocationModal(false)}
                  className="text-white hover:text-yellow-300 text-lg font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveLocationForm} className="p-6 flex flex-col gap-4">
                <p className="text-xs text-gray-500 leading-relaxed font-medium">
                  Provide your city and specific area so Sandy's AI Fry-Guide can coordinate logistics and verify your premium crisp delivery!
                </p>

                {/* City Input Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 font-extrabold uppercase">City in Pakistan</label>
                  <input 
                    id="modal_city_input"
                    type="text"
                    required
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    placeholder="e.g. Karachi, Lahore, Islamabad"
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-[#004B23] font-medium"
                  />
                </div>

                {/* Area Input Selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-gray-400 font-extrabold uppercase">Specific Area / Sector</label>
                  <input 
                    id="modal_area_input"
                    type="text"
                    required
                    value={areaInput}
                    onChange={(e) => setAreaInput(e.target.value)}
                    placeholder="e.g. Clifton, DHA, Gulshan, G-11, Gulberg"
                    className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-[#004B23] font-medium"
                  />
                </div>

                <button 
                  id="modal_save_location_btn"
                  type="submit"
                  className="w-full bg-[#004B23] hover:bg-[#003117] text-white font-extrabold text-sm py-3.5 rounded-xl transition shadow-sm mt-2"
                >
                  Apply & Lock Location
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Success Order Celebration Modal */}
      <AnimatePresence>
        {isOrderPlaced && (
          <div id="success_modal_overlay" className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              id="success_modal_card"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-lg border-2 border-[#D4AF37]"
            >
              {/* Confetti Accent Header */}
              <div className="bg-gradient-to-r from-[#004B23] to-[#003B1C] p-8 text-center text-white relative">
                <div className="absolute top-2 left-6 text-xl animate-bounce">🍟</div>
                <div className="absolute top-3 right-6 text-xl animate-ping">🎉</div>
                
                <div className="w-16 h-16 rounded-full bg-[#FFB703] text-[#004B23] flex items-center justify-center mx-auto mb-3 shadow-lg">
                  <ThumbsUp className="w-8 h-8 fill-[#004B23]" />
                </div>
                
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                  Zabardast! Order Confirmed!
                </h3>
                <p className="text-xs text-yellow-300 font-bold mt-1 uppercase tracking-widest">
                  “Sandy Frozen Fries – Har Bite Mein Family Delight”
                </p>
              </div>

              <div className="p-8 flex flex-col gap-5 text-center sm:text-left">
                <p className="text-sm text-gray-600 leading-normal font-medium">
                  Thank you for ordering with **Sandy’s Frozen Fries**! Our premium green and white bags are being prepared raw from freezer to box. 
                </p>

                {/* Live Receipt Breakdown */}
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 font-mono text-xs flex flex-col gap-2.5 text-gray-700">
                  <div className="flex justify-between font-bold text-gray-900 border-b border-gray-200 pb-2">
                    <span>ITEM DETAIL</span>
                    <span>TOTAL</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sandy Frozen Bags ({cart.quantity}x)</span>
                    <span>Rs. {rawSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Coordinate Logistics</span>
                    <span>{cart.quantity >= 3 ? "FREE" : `Rs. ${cart.deliveryFee}`}</span>
                  </div>
                  <div className="flex justify-between italic">
                    <span>Delivery Destination</span>
                    <span className="font-sans font-semibold text-gray-950">{cart.area}, {cart.city}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2.5 text-sm font-black text-[#004B23] font-sans">
                    <span>TOTAL AMOUNT PAID</span>
                    <span>Rs. {grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
                  <div className="p-3 bg-yellow-50 rounded-xl border border-yellow-200 text-gray-800 text-xs flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#FFB703] shrink-0" />
                    <p className="text-left font-medium">
                      🚀 <strong>Delivery Slot:</strong> {cart.city.toLowerCase() === "karachi" ? "24–48 hours" : "2–3 business days"} guaranteed nationwide.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <a 
                    href={`https://wa.me/923000000000?text=${encodeURIComponent(
                      `Assalam-o-Alaikum! Please confirm my Sandy Frozen Fries order of ${cart.quantity} bags for ${cart.area}, ${cart.city}. Total: Rs. ${grandTotal}.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 bg-[#25D366] hover:bg-[#1faa4f] text-white font-extrabold text-sm py-4.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition"
                  >
                    <Phone className="w-4 h-4 fill-white" />
                    <span>Ping WhatsApp Confirmation</span>
                  </a>
                  
                  <button 
                    onClick={() => {
                      setIsOrderPlaced(false);
                      setCart(prev => ({ ...prev, quantity: 1 }));
                    }}
                    className="flex-shrink-0 bg-gray-150 hover:bg-gray-200 text-gray-800 font-extrabold text-sm py-4.5 px-6 rounded-2xl transition"
                  >
                    Back to Counter
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
