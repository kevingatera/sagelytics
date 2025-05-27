'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Button } from '~/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '~/components/ui/avatar';
import { useToast } from '~/components/ui/use-toast';
import { api } from '~/trpc/react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // TODO: Replace with real upload logic
    const url = URL.createObjectURL(file); // Mock: use local blob URL
    setForm((prev) => ({ ...prev, image: url }));
    toast({ title: 'Avatar updated (mock)', description: 'This is a local preview. Implement real upload.' });
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
        description: 'Failed to update profile. Please try again.',
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
        description: 'Your password has been updated successfully.',
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Failed to update password. Please try again.';
      toast({
        title: 'Error',
        description: errMsg,
        variant: 'destructive',
      });
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
              <Avatar className="h-20 w-20 cursor-pointer" onClick={handleAvatarClick}>
                <AvatarImage src={form.image || '/placeholder-avatar.jpg'} alt="Profile" />
                <AvatarFallback>User</AvatarFallback>
              </Avatar>
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
              <Button variant="outline" type="button" onClick={handleAvatarClick}>
                Change Avatar
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="john@example.com" />
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