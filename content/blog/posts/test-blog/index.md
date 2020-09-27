---
title: Test Blog
date: "2020-05-28T22:40:32.169Z"
description: This is a custom description for SEO and Open Graph purposes, rather than the default generated excerpt. Simply add a description field to the frontmatter.
tags: ["animals", "chicago", "zoos", "java"]
---

Far far away, behind the word mountains, far from the countries Vokalia and
Consonantia, there live the blind texts. Separated they live in Bookmarksgrove
right at the coast of the Semantics, a large language ocean. A small river named
Duden flows by their place and supplies it with the necessary regelialia.

## On deer horse aboard tritely yikes and much

```java
/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.apache.dubbo.common.serialize.avro;


import org.apache.dubbo.common.serialize.model.Person;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.core.Is.is;
import static org.hamcrest.core.IsNot.not;
import static org.hamcrest.core.IsNull.nullValue;


public class AvroObjectInputOutputTest {
    private AvroObjectInput avroObjectInput;
    private AvroObjectOutput avroObjectOutput;

    private PipedOutputStream pos;
    private PipedInputStream pis;

    @BeforeEach
    public void setup() throws IOException {
        pis = new PipedInputStream();
        pos = new PipedOutputStream();
        pis.connect(pos);

        avroObjectOutput = new AvroObjectOutput(pos);
        avroObjectInput = new AvroObjectInput(pis);
    }

    @AfterEach
    public void clean() throws IOException {
        if (pos != null) {
            pos.close();
            pos = null;
        }
        if (pis != null) {
            pis.close();
            pis = null;
        }
    }

    @Test
    public void testWriteReadBool() throws IOException, InterruptedException {
        avroObjectOutput.writeBool(true);
        avroObjectOutput.flushBuffer();
        pos.close();

        boolean result = avroObjectInput.readBool();
        assertThat(result, is(true));
    }

    @Test
    public void testWriteReadByte() throws IOException {
        avroObjectOutput.writeByte((byte) 'a');
        avroObjectOutput.flushBuffer();
        pos.close();

        Byte result = avroObjectInput.readByte();

        assertThat(result, is((byte) 'a'));
    }

    @Test
    public void testWriteReadBytes() throws IOException {
        avroObjectOutput.writeBytes("123456".getBytes());
        avroObjectOutput.flushBuffer();
        pos.close();

        byte[] result = avroObjectInput.readBytes();

        assertThat(result, is("123456".getBytes()));
    }

    @Test
    public void testWriteReadShort() throws IOException {
        avroObjectOutput.writeShort((short) 1);
        avroObjectOutput.flushBuffer();
        pos.close();

        short result = avroObjectInput.readShort();

        assertThat(result, is((short) 1));
    }

    @Test
    public void testWriteReadInt() throws IOException {
        avroObjectOutput.writeInt(1);
        avroObjectOutput.flushBuffer();
        pos.close();

        Integer result = avroObjectInput.readInt();

        assertThat(result, is(1));
    }

    @Test
    public void testReadDouble() throws IOException {
        avroObjectOutput.writeDouble(3.14d);
        avroObjectOutput.flushBuffer();
        pos.close();

        Double result = avroObjectInput.readDouble();

        assertThat(result, is(3.14d));
    }

    @Test
    public void testReadLong() throws IOException {
        avroObjectOutput.writeLong(10L);
        avroObjectOutput.flushBuffer();
        pos.close();

        Long result = avroObjectInput.readLong();

        assertThat(result, is(10L));
    }

    @Test
    public void testWriteReadFloat() throws IOException {
        avroObjectOutput.writeFloat(1.66f);
        avroObjectOutput.flushBuffer();
        pos.close();

        Float result = avroObjectInput.readFloat();

        assertThat(result, is(1.66F));
    }

    @Test
    public void testWriteReadUTF() throws IOException {
        avroObjectOutput.writeUTF("wording");
        avroObjectOutput.flushBuffer();
        pos.close();

        String result = avroObjectInput.readUTF();

        assertThat(result, is("wording"));
    }

    @Test
    public void testWriteReadObject() throws IOException, ClassNotFoundException {
        Person p = new Person();
        p.setAge(30);
        p.setName("abc");

        avroObjectOutput.writeObject(p);
        avroObjectOutput.flushBuffer();
        pos.close();

        Person result = avroObjectInput.readObject(Person.class);

        assertThat(result, not(nullValue()));
        assertThat(result.getName(), is("abc"));
        assertThat(result.getAge(), is(30));
    }

    @Test
    public void testWriteReadObjectWithoutClass() throws IOException, ClassNotFoundException {
        Person p = new Person();
        p.setAge(30);
        p.setName("abc");

        avroObjectOutput.writeObject(p);
        avroObjectOutput.flushBuffer();
        pos.close();

        //这里会丢失所有信息
        Object result = avroObjectInput.readObject();

        assertThat(result, not(nullValue()));
//		assertThat(result.getName(), is("abc"));
//		assertThat(result.getAge(), is(30));
    }
}
```
The Big Oxmox advised her not to do so, because there were thousands of bad
Commas, wild Question Marks and devious Semikoli, but the Little Blind Text
didn’t listen. She packed her seven versalia, put her initial into the belt and
made herself on the way.

- This however showed weasel
- Well uncritical so misled
  - this is very interesting
- Goodness much until that fluid owl

When she reached the first hills of the **Italic Mountains**, she had a last
view back on the skyline of her hometown _Bookmarksgrove_, the headline of
[Alphabet Village](http://google.com) and the subline of her own road, the Line
Lane. Pityful a rhetoric question ran over her cheek, then she continued her
way. On her way she met a copy.

### Overlaid the jeepers uselessly much excluding

But nothing the copy said could convince her and so it didn’t take long until a
few insidious Copy Writers ambushed her, made her drunk with
[Longe and Parole](http://google.com) and dragged her into their agency, where
they abused her for their projects again and again. And if she hasn’t been
rewritten, then they are still using her.

> Far far away, behind the word mountains, far from the countries Vokalia and
> Consonantia, there live the blind texts. Separated they live in Bookmarksgrove
> right at the coast of the Semantics, a large language ocean.

It is a paradisematic country, in which roasted parts of sentences fly into your
mouth. Even the all-powerful Pointing has no control about the blind texts it is
an almost unorthographic life One day however a small line of blind text by the
name of Lorem Ipsum decided to leave for the far World of Grammar.

### According a funnily until pre-set or arrogant well cheerful

The Big Oxmox advised her not to do so, because there were thousands of bad
Commas, wild Question Marks and devious Semikoli, but the Little Blind Text
didn’t listen. She packed her seven versalia, put her initial into the belt and
made herself on the way.

1.  So baboon this
2.  Mounted militant weasel gregariously admonishingly straightly hey
3.  Dear foresaw hungry and much some overhung
4.  Rash opossum less because less some amid besides yikes jeepers frenetic
    impassive fruitlessly shut

When she reached the first hills of the Italic Mountains, she had a last view
back on the skyline of her hometown Bookmarksgrove, the headline of Alphabet
Village and the subline of her own road, the Line Lane. Pityful a rhetoric
question ran over her cheek, then she continued her way. On her way she met a
copy.

> The copy warned the Little Blind Text, that where it came from it would have
> been rewritten a thousand times and everything that was left from its origin
> would be the word "and" and the Little Blind Text should turn around and
> return to its own, safe country.

But nothing the copy said could convince her and so it didn’t take long until a
few insidious Copy Writers ambushed her, made her drunk with Longe and Parole
and dragged her into their agency, where they abused her for their projects
again and again. And if she hasn’t been rewritten, then they are still using
her. Far far away, behind the word mountains, far from the countries Vokalia and
Consonantia, there live the blind texts.

#### Silent delightfully including because before one up barring chameleon

Separated they live in Bookmarksgrove right at the coast of the Semantics, a
large language ocean. A small river named Duden flows by their place and
supplies it with the necessary regelialia. It is a paradisematic country, in
which roasted parts of sentences fly into your mouth.

Even the all-powerful Pointing has no control about the blind texts it is an
almost unorthographic life One day however a small line of blind text by the
name of Lorem Ipsum decided to leave for the far World of Grammar. The Big Oxmox
advised her not to do so, because there were thousands of bad Commas, wild
Question Marks and devious Semikoli, but the Little Blind Text didn’t listen.

##### Wherever far wow thus a squirrel raccoon jeez jaguar this from along

She packed her seven versalia, put her initial into the belt and made herself on
the way. When she reached the first hills of the Italic Mountains, she had a
last view back on the skyline of her hometown Bookmarksgrove, the headline of
Alphabet Village and the subline of her own road, the Line Lane. Pityful a
rhetoric question ran over her cheek, then she continued her way. On her way she
met a copy.

###### Slapped cozy a that lightheartedly and far

The copy warned the Little Blind Text, that where it came from it would have
been rewritten a thousand times and everything that was left from its origin
would be the word "and" and the Little Blind Text should turn around and return
to its own, safe country. But nothing the copy said could convince her and so it
didn’t take long until a few insidious Copy Writers ambushed her, made her drunk
with Longe and Parole and dragged her into their agency, where they abused her
for their projects again and again.
