import { MailOutlined, LockOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Form, Input, Layout, Space, Typography } from "antd";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import {
  PASSWORD_COMPLEXITY_MESSAGE,
  PASSWORD_COMPLEXITY_REGEX,
  PASSWORD_MIN_LENGTH,
} from "@shared/constants";
import { requestPasswordReset, resetPassword } from "../providers/authProvider";

const { Title, Text } = Typography;

interface ForgotPasswordValues {
  email: string;
}

interface ResetPasswordValues {
  token: string;
  new_password: string;
  confirm_password: string;
}

const AuthCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Layout
    style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    }}
  >
    <Card style={{ width: "100%", maxWidth: 420, padding: "32px 24px" }}>{children}</Card>
  </Layout>
);

export const ForgotPasswordPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const onFinish = async ({ email }: ForgotPasswordValues) => {
    setLoading(true);
    setErrorMessage("");
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Permintaan reset password gagal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div style={{ textAlign: "center" }}>
          <Title level={3} style={{ marginBottom: 8 }}>
            Lupa kata sandi
          </Title>
          <Text type="secondary">
            Masukkan email admin. Jika akun tersedia, tautan reset akan dikirim.
          </Text>
        </div>

        {submitted ? (
          <Alert
            type="success"
            showIcon
            message="Periksa email Anda"
            description="Jika email terdaftar, tautan reset password akan segera dikirim."
          />
        ) : (
          <>
            {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}
            <Form<ForgotPasswordValues> layout="vertical" onFinish={onFinish} requiredMark={false}>
              <Form.Item
                name="email"
                label="Email"
                rules={[
                  { required: true, message: "Masukkan email Anda." },
                  { type: "email", message: "Masukkan format email yang valid." },
                ]}
              >
                <Input prefix={<MailOutlined />} size="large" autoComplete="email" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large">
                Kirim tautan reset
              </Button>
            </Form>
          </>
        )}

        <Link to="/login" style={{ textAlign: "center" }}>
          Kembali ke halaman login
        </Link>
      </Space>
    </AuthCard>
  );
};

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onFinish = async (values: ResetPasswordValues) => {
    setLoading(true);
    setErrorMessage("");
    try {
      await resetPassword(values.token, values.new_password);
      setSubmitted(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Reset password gagal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <div style={{ textAlign: "center" }}>
          <Title level={3} style={{ marginBottom: 8 }}>
            Buat kata sandi baru
          </Title>
          <Text type="secondary">
            Gunakan kata sandi minimal {PASSWORD_MIN_LENGTH} karakter dengan kombinasi huruf, angka,
            dan simbol.
          </Text>
        </div>

        {submitted ? (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Alert type="success" showIcon message="Password berhasil diubah." />
            <Button type="primary" onClick={() => navigate("/login")} block>
              Masuk ke admin
            </Button>
          </Space>
        ) : (
          <>
            {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}
            <Form<ResetPasswordValues>
              layout="vertical"
              onFinish={onFinish}
              requiredMark={false}
              initialValues={{ token: searchParams.get("token") ?? "" }}
            >
              <Form.Item
                name="token"
                label="Token reset"
                rules={[{ required: true, message: "Token reset tidak ditemukan." }]}
              >
                <Input.TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
              </Form.Item>
              <Form.Item
                name="new_password"
                label="Kata sandi baru"
                rules={[
                  { required: true, message: "Masukkan kata sandi baru." },
                  {
                    min: PASSWORD_MIN_LENGTH,
                    message: `Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter.`,
                  },
                  { pattern: PASSWORD_COMPLEXITY_REGEX, message: PASSWORD_COMPLEXITY_MESSAGE },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
              </Form.Item>
              <Form.Item
                name="confirm_password"
                label="Ulangi kata sandi"
                dependencies={["new_password"]}
                rules={[
                  { required: true, message: "Ulangi kata sandi baru." },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("new_password") === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error("Kata sandi tidak sama."));
                    },
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Simpan kata sandi
              </Button>
            </Form>
          </>
        )}

        <Link to="/login" style={{ textAlign: "center" }}>
          Kembali ke halaman login
        </Link>
      </Space>
    </AuthCard>
  );
};
