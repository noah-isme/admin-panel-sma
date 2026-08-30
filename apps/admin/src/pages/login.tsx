import { useLogin } from "@refinedev/core";
import { ThemedTitle as ThemedTitleV2 } from "@refinedev/antd";
import { Form, Input, Button, Card, Typography, Layout, Space, Alert } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useNavigate } from "react-router";

const { Title, Text } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export const LoginPage: React.FC = () => {
  const { mutate: login, isPending: isLoading } = useLogin<LoginFormValues>();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string>("");

  const onFinish = (values: LoginFormValues) => {
    setErrorMessage("");
    login(values, {
      onError: (error) => {
        setErrorMessage(error.message || "Login failed. Please try again.");
      },
    });
  };

  return (
    <Layout
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "32px 24px",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.1)",
        }}
      >
        <Space direction="vertical" size="large" style={{ width: "100%", textAlign: "center" }}>
          <ThemedTitleV2 collapsed={false} />

          <div>
            <Title level={3} style={{ marginBottom: 8 }}>
              Welcome Back
            </Title>
            <Text type="secondary">Sign in to your admin account</Text>
          </div>

          {errorMessage && (
            <Alert
              message={errorMessage}
              type="error"
              showIcon
              closable
              onClose={() => setErrorMessage("")}
            />
          )}

          <Form
            name="login-form"
            layout="vertical"
            onFinish={onFinish}
            requiredMark={false}
            initialValues={{
              email: "",
              password: "",
            }}
          >
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: "Please input your email!" },
                { type: "email", message: "Please enter a valid email!" },
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="email@example.com"
                size="large"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: "Please input your password!" }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="••••••••"
                size="large"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" loading={isLoading} size="large" block>
                Sign In
              </Button>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, textAlign: "center" }}>
              <Button type="link" onClick={() => navigate("/forgot-password")}>
                Lupa kata sandi?
              </Button>
            </Form.Item>
          </Form>

          {import.meta.env.DEV ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Default credentials: superadmin@example.sch.id / Admin123!
            </Text>
          ) : null}
        </Space>
      </Card>
    </Layout>
  );
};
