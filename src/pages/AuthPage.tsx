import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";


// 소셜 로그인 아이콘 컴포넌트
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const NaverIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path
      d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727z"
      fill="white"
    />
  </svg>
);

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const { signIn, signUp, signInWithGoogle, signInWithNaver } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "로그인 실패",
            description: error.message === "Invalid login credentials"
              ? "이메일 또는 비밀번호가 올바르지 않습니다."
              : error.message,
            variant: "destructive",
          });
        } else {
          navigate("/");
        }
      } else {
        if (password.length < 6) {
          toast({
            title: "회원가입 실패",
            description: "비밀번호는 6자 이상이어야 합니다.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "회원가입 실패",
              description: "이미 가입된 이메일입니다.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "회원가입 실패",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "회원가입 성공",
            description: "환영합니다! 로그인되었습니다.",
          });
          navigate("/");
        }
      }
    } catch (error) {
      toast({
        title: "오류 발생",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 소셜 로그인/회원가입 핸들러
  const handleSocialLogin = async (provider: 'google' | 'naver') => {
    setSocialLoading(provider);

    try {
      let result;
      switch (provider) {
        case 'google':
          result = await signInWithGoogle();
          break;
        case 'naver':
          result = await signInWithNaver();
          break;
      }

      if (result?.error) {
        let errorDescription = result.error.message;
        if ((result.error as any).code === 'auth/invalid-credential' && result.error.message.includes('sub')) {
          errorDescription = "네이버 로그인 설정 오류 (sub mismatch). 파이버베이스 콘솔의 '특성 매칭' 설정을 확인해주세요.";
        } else if ((result.error as any).code === 'auth/operation-not-allowed') {
          errorDescription = "해당 로그인 방식이 활성화되지 않았습니다. 파이어베이스 콘솔에서 설정을 확인해주세요.";
        }

        toast({
          title: "로그인 실패",
          description: errorDescription,
          variant: "destructive",
        });
      } else {
        // 소셜 로그인 성공 시 홈으로 이동
        navigate("/");
      }
    } catch (error) {
      toast({
        title: "오류 발생",
        description: "잠시 후 다시 시도해주세요.",
        variant: "destructive",
      });
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="물리치료학과" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">물리치료학과</h1>
          <p className="text-muted-foreground mt-1">협업 캘린더</p>
        </div>

        {/* Auth Card */}
        <div className="glass-card p-8 animate-scale-in">
          <h2 className="text-xl font-bold text-foreground mb-6">
            {isLogin ? "로그인" : "회원가입"}
          </h2>

          {/* 소셜 로그인/회원가입 버튼 */}
          <div className="space-y-3 mb-6">
            {/* Google */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 rounded-xl gap-3 bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
              onClick={() => handleSocialLogin('google')}
              disabled={socialLoading !== null}
            >
              {socialLoading === 'google' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <GoogleIcon />
                  Google로 {isLogin ? "로그인" : "회원가입"}
                </>
              )}
            </Button>

            {/* Naver */}
            <Button
              type="button"
              className="w-full h-12 rounded-xl gap-3"
              style={{ backgroundColor: '#03C75A', color: 'white' }}
              onClick={() => handleSocialLogin('naver')}
              disabled={socialLoading !== null}
            >
              {socialLoading === 'naver' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <NaverIcon />
                  네이버로 {isLogin ? "로그인" : "회원가입"}
                </>
              )}
            </Button>
          </div>

          {/* 구분선 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">또는 이메일로</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">


            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">이메일</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="professor@university.ac.kr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-10 rounded-xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">비밀번호</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="pl-10 rounded-xl bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-primary/50"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full rounded-xl h-12 shadow-lg shadow-primary/25 gap-2"
              disabled={loading || socialLoading !== null}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isLogin ? "로그인" : "회원가입"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin ? "계정이 없으신가요? 회원가입" : "이미 계정이 있으신가요? 로그인"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;