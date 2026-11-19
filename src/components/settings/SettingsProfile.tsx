'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Button } from '~/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { useToast } from '~/components/ui/use-toast';
import { api } from '~/trpc/react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { TRPCClientError } from '@trpc/client';

export function SettingsProfile() {
  const { toast } = useToast();
  const { status } = useSession();
  const router = useRouter();
  
  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      toast({
        title: 'Session expired',
        description: 'Please log in again to continue.',
        variant: 'destructive',
      });
      router.push('/login');
    }
  }, [status, router, toast]);
  
  // Only make API calls when authenticated
  const { data, isLoading: isProfileLoading } = api.user.getProfile.useQuery(undefined, {
    enabled: status === 'authenticated'
  });
  
  const updateProfile = api.user.updateProfile.useMutation();
  const updatePassword = api.user.updatePassword.useMutation();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    image: '',
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        name: data.name ?? '',
        email: data.email ?? '',
        image: data.image ?? '',
      });
    }
  }, [data]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await updateProfile.mutateAsync(form);
      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error && error.message ? error.message : 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswords((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPasswordLoading(true);
    try {
      await updatePassword.mutateAsync(passwords);
      toast({
        title: 'Password updated',
        description: 'Sign in again with your new password. Other devices have been signed out.',
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      await signOut({ callbackUrl: '/login' });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Failed to update password. Please try again.';
      toast({
        title: 'Error',
        description: errMsg,
        variant: 'destructive',
      });
      // The password was reset elsewhere, so this session has already ended.
      if (error instanceof TRPCClientError && error.data?.code === 'CONFLICT') {
        await signOut({ callbackUrl: '/login' });
      }
    } finally {
      setIsPasswordLoading(false);
    }
  };

  // Show loading state or redirect when not authenticated
  if (status === 'loading' || isProfileLoading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }
  if (status === 'unauthenticated' || !data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Manage your profile information and account settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                {form.image ? <AvatarImage src={form.image} alt="Profile" /> : null}
                <AvatarFallback>{form.name.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
              </Avatar>
              <p className="text-sm text-muted-foreground">
                Set an avatar by pasting an image URL below.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={form.email} readOnly aria-describedby="email-note" placeholder="john@example.com" />
              <p id="email-note" className="text-sm text-muted-foreground">Contact support to change your email.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image">Avatar URL</Label>
              <Input id="image" name="image" value={form.image} onChange={handleChange} placeholder="https://..." />
            </div>

            <Button type="submit" disabled={isLoading || isProfileLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handlePasswordSubmit}>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" name="currentPassword" type="password" value={passwords.currentPassword} onChange={handlePasswordChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" name="newPassword" type="password" value={passwords.newPassword} onChange={handlePasswordChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" name="confirmPassword" type="password" value={passwords.confirmPassword} onChange={handlePasswordChange} />
            </div>
            <Button type="submit" disabled={isPasswordLoading}>
              {isPasswordLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}